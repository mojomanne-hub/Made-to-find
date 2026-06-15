-- ============================================================
-- MaDe to find – Initiales Datenbankschema
-- Migration: 001_initial_schema
-- Version:   2.0 (mit Soft Delete, color, display_name)
--
-- Ausführen: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ============================================================
-- ERWEITERUNGEN
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- HILFSFUNKTIONEN
-- ============================================================

-- Setzt updated_at automatisch bei jedem UPDATE
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ============================================================
-- TABELLE: profiles
-- Wird automatisch bei Registrierung durch Trigger befüllt.
-- Erweitert auth.users – niemals direkt schreiben außer via Trigger.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id           uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        text        NOT NULL,
  display_name text,                          -- Optional: Anzeigename für Begrüßung
  created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.profiles              IS 'Benutzerprofile – 1:1 mit auth.users';
COMMENT ON COLUMN public.profiles.display_name IS 'Optionaler Anzeigename; email wird als Fallback genutzt';


-- ============================================================
-- TABELLE: locations (Ablageorte)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.locations (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text        NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 100),
  description text        CHECK (char_length(description) <= 500),
  color       text        CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),  -- Hex-Farbe z.B. #3b82f6
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz                               -- Soft Delete: NULL = aktiv
);

-- Performance-Indizes
CREATE INDEX IF NOT EXISTS idx_locations_user_id   ON public.locations(user_id)   WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_locations_name      ON public.locations(name)      WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_locations_updated   ON public.locations(updated_at DESC) WHERE deleted_at IS NULL;

-- Trigger: updated_at automatisch setzen
CREATE OR REPLACE TRIGGER trg_locations_updated_at
  BEFORE UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE  public.locations            IS 'Ablageorte des Benutzers (z.B. Keller Regal A)';
COMMENT ON COLUMN public.locations.color      IS 'Optionale Hex-Farbe für visuelle Unterscheidung';
COMMENT ON COLUMN public.locations.deleted_at IS 'Soft Delete: gesetzt = gelöscht, NULL = aktiv';


-- ============================================================
-- TABELLE: items (Artikel)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.items (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id uuid        NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id)       ON DELETE CASCADE,
  name        text        NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 200),
  description text        CHECK (char_length(description) <= 1000),
  quantity    integer     NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz                               -- Soft Delete
);

-- Performance-Indizes
CREATE INDEX IF NOT EXISTS idx_items_user_id     ON public.items(user_id)    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_items_location_id ON public.items(location_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_items_name        ON public.items(name)        WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_items_updated     ON public.items(updated_at DESC) WHERE deleted_at IS NULL;

-- Volltext-Index für Suche (Deutsch + Englisch)
CREATE INDEX IF NOT EXISTS idx_items_search ON public.items
  USING gin(
    to_tsvector('german', coalesce(name, '') || ' ' || coalesce(description, ''))
  )
  WHERE deleted_at IS NULL;

-- Trigger: updated_at automatisch setzen
CREATE OR REPLACE TRIGGER trg_items_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE  public.items            IS 'Artikel/Gegenstände an einem Ablageort';
COMMENT ON COLUMN public.items.quantity   IS 'Anzahl, mindestens 0 (= ausverkauft/nicht vorhanden)';
COMMENT ON COLUMN public.items.deleted_at IS 'Soft Delete: gesetzt = gelöscht, NULL = aktiv';


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Kritisch: Jeder Benutzer sieht AUSSCHLIESSLICH seine eigenen Daten.
-- Soft-gelöschte Datensätze (deleted_at IS NOT NULL) sind immer unsichtbar.
-- ============================================================

-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- locations
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "locations_select_own"
  ON public.locations FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "locations_insert_own"
  ON public.locations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "locations_update_own"
  ON public.locations FOR UPDATE
  USING (auth.uid() = user_id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "locations_delete_own"
  ON public.locations FOR DELETE
  USING (auth.uid() = user_id);


-- items
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "items_select_own"
  ON public.items FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "items_insert_own"
  ON public.items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "items_update_own"
  ON public.items FOR UPDATE
  USING (auth.uid() = user_id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "items_delete_own"
  ON public.items FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================
-- TRIGGER: Profil bei Registrierung automatisch erstellen
-- Läuft mit SECURITY DEFINER – Zugriff auf auth.users erlaubt
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING; -- Idempotent: kein Fehler bei Duplikaten
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- VIEW: active_locations
-- Convenience-View – filtert soft-gelöschte Einträge heraus.
-- RLS der Basistabelle gilt weiterhin.
-- ============================================================
CREATE OR REPLACE VIEW public.active_locations AS
  SELECT * FROM public.locations WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.active_items AS
  SELECT * FROM public.items WHERE deleted_at IS NULL;


-- ============================================================
-- FUNKTION: Globale Suche
-- Durchsucht Artikelname, Beschreibung und Ablageortname.
-- Gibt maximal 20 Items + 10 Locations zurück.
-- Mindestlänge des Suchbegriffs: 2 Zeichen (per App-Konvention,
-- DB erzwingt es nicht – das geschieht in der Validierung).
-- ============================================================
CREATE OR REPLACE FUNCTION public.search(query text)
RETURNS TABLE (
  kind          text,
  id            uuid,
  name          text,
  description   text,
  location_id   uuid,
  location_name text,
  quantity      integer,
  updated_at    timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Artikel (max. 20)
  SELECT
    'item'::text                          AS kind,
    i.id,
    i.name,
    i.description,
    i.location_id,
    l.name                                AS location_name,
    i.quantity,
    i.updated_at
  FROM public.items i
  JOIN public.locations l ON l.id = i.location_id AND l.deleted_at IS NULL
  WHERE
    i.user_id    = auth.uid()
    AND i.deleted_at IS NULL
    AND (
      i.name        ILIKE '%' || query || '%'
      OR i.description ILIKE '%' || query || '%'
      OR l.name     ILIKE '%' || query || '%'
    )
  ORDER BY i.updated_at DESC
  LIMIT 20

  UNION ALL

  -- Ablageorte (max. 10) – nur wenn name trifft
  SELECT
    'location'::text AS kind,
    lo.id,
    lo.name,
    lo.description,
    lo.id            AS location_id,
    lo.name          AS location_name,
    NULL::integer    AS quantity,
    lo.updated_at
  FROM public.locations lo
  WHERE
    lo.user_id   = auth.uid()
    AND lo.deleted_at IS NULL
    AND lo.name  ILIKE '%' || query || '%'
  ORDER BY lo.updated_at DESC
  LIMIT 10;
$$;
