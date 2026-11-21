-- ============================================================
-- MaDe to find – Ferienwohnung / Gäste-QR-Code
-- Migration: 002_ferienwohnung_gaeste_qr
--
-- Ausführen: Supabase Dashboard → SQL Editor → komplett einfügen → Run
-- Kann gefahrlos mehrfach ausgeführt werden.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Gruppentyp: 'standard' (Familie/Haushalt) oder 'ferienwohnung'
-- ------------------------------------------------------------
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS group_type text NOT NULL DEFAULT 'standard';

ALTER TABLE public.groups DROP CONSTRAINT IF EXISTS groups_group_type_check;
ALTER TABLE public.groups
  ADD CONSTRAINT groups_group_type_check CHECK (group_type IN ('standard', 'ferienwohnung'));

COMMENT ON COLUMN public.groups.group_type IS 'standard = Familie/Haushalt, ferienwohnung = mit Gäste-QR-Code (nur lesen)';


-- Nur der Ersteller darf den Gruppentyp ändern (andere Mitglieder dürfen weiter umbenennen)
CREATE OR REPLACE FUNCTION public.protect_group_type()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.group_type IS DISTINCT FROM OLD.group_type
     AND auth.uid() IS NOT NULL
     AND OLD.created_by IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Nur der Ersteller kann den Gruppentyp ändern';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_group_type ON public.groups;
CREATE TRIGGER trg_protect_group_type
  BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.protect_group_type();


-- ------------------------------------------------------------
-- 2. Hilfsfunktion: Ist der angemeldete Nutzer Ersteller der Gruppe?
--    (SECURITY DEFINER, damit keine RLS-Rekursion entsteht)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_creator_of_group(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = p_group_id AND created_by = auth.uid()
  );
$$;


-- ------------------------------------------------------------
-- 3. Öffentliche Gäste-Links (ein QR-Code pro Gruppe)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.group_public_links (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   uuid        NOT NULL UNIQUE REFERENCES public.groups(id) ON DELETE CASCADE,
  token      text        NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz NOT NULL DEFAULT now(),
  renewed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.group_public_links ENABLE ROW LEVEL SECURITY;

-- Nur der Ersteller sieht den Link. Anlegen/Erneuern läuft ausschließlich über die Funktion unten.
DROP POLICY IF EXISTS group_public_links_select_creator ON public.group_public_links;
CREATE POLICY group_public_links_select_creator
  ON public.group_public_links FOR SELECT
  TO authenticated
  USING (public.is_creator_of_group(group_id));


-- Link holen oder anlegen (p_renew = true → neuer Token, alter QR-Code wird sofort ungültig)
CREATE OR REPLACE FUNCTION public.get_or_create_public_link(p_group_id uuid, p_renew boolean DEFAULT false)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
BEGIN
  IF NOT public.is_creator_of_group(p_group_id) THEN
    RAISE EXCEPTION 'Nur der Ersteller kann den Gäste-QR-Code verwalten';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.groups WHERE id = p_group_id AND group_type = 'ferienwohnung') THEN
    RAISE EXCEPTION 'Gäste-QR-Codes gibt es nur für Ferienwohnungs-Gruppen';
  END IF;

  IF p_renew THEN
    UPDATE public.group_public_links
       SET token = replace(gen_random_uuid()::text, '-', ''), renewed_at = now()
     WHERE group_id = p_group_id
    RETURNING token INTO v_token;
  ELSE
    SELECT token INTO v_token FROM public.group_public_links WHERE group_id = p_group_id;
  END IF;

  IF v_token IS NULL THEN
    INSERT INTO public.group_public_links (group_id)
    VALUES (p_group_id)
    RETURNING token INTO v_token;
  END IF;

  RETURN v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_public_link(uuid, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_public_link(uuid, boolean) TO authenticated;


-- ------------------------------------------------------------
-- 4. Öffentliche Nur-Lese-Ansicht für Gäste (ohne Login)
--    Die Tabellen selbst bleiben für anonyme Nutzer komplett gesperrt.
--    Diese Funktion gibt nur die Daten EINER Gruppe zurück – und nur
--    die Felder, die Gäste sehen sollen (keine user_id, keine E-Mails).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_inventory(p_token text)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id uuid;
  v_name     text;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[a-f0-9]{32}$' THEN
    RETURN NULL;
  END IF;

  SELECT g.id, g.name INTO v_group_id, v_name
    FROM public.group_public_links pl
    JOIN public.groups g ON g.id = pl.group_id
   WHERE pl.token = p_token
     AND g.group_type = 'ferienwohnung';

  IF v_group_id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN json_build_object(
    'group_name', v_name,

    'locations', COALESCE((
      SELECT json_agg(json_build_object(
               'id', l.id, 'name', l.name, 'description', l.description,
               'color', l.color, 'icon', l.icon, 'image_url', l.image_url
             ) ORDER BY l.name)
        FROM public.locations l
       WHERE l.group_id = v_group_id AND l.deleted_at IS NULL
    ), '[]'::json),

    'shelves', COALESCE((
      SELECT json_agg(json_build_object(
               'id', s.id, 'location_id', s.location_id, 'name', s.name, 'position', s.position
             ) ORDER BY s.position)
        FROM public.shelves s
        JOIN public.locations l ON l.id = s.location_id
       WHERE l.group_id = v_group_id AND l.deleted_at IS NULL
    ), '[]'::json),

    'items', COALESCE((
      SELECT json_agg(json_build_object(
               'id', i.id, 'location_id', i.location_id, 'shelf_id', i.shelf_id,
               'name', i.name, 'description', i.description, 'quantity', i.quantity,
               'icon', i.icon, 'color', i.color, 'image_url', i.image_url
             ) ORDER BY i.name)
        FROM public.items i
        JOIN public.locations l ON l.id = i.location_id
       WHERE i.group_id = v_group_id AND i.deleted_at IS NULL AND l.deleted_at IS NULL
    ), '[]'::json)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_inventory(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_inventory(text) TO anon, authenticated;


-- ------------------------------------------------------------
-- 5. Ersteller darf andere Mitglieder aus der Gruppe entfernen
--    (zusätzlich zur bestehenden Regel "selbst austreten")
-- ------------------------------------------------------------
DROP POLICY IF EXISTS group_members_delete_by_creator ON public.group_members;
CREATE POLICY group_members_delete_by_creator
  ON public.group_members FOR DELETE
  TO authenticated
  USING (public.is_creator_of_group(group_id) AND user_id <> auth.uid());
