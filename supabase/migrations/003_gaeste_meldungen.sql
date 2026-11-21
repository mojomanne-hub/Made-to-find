-- ============================================================
-- MaDe to find – Gäste melden defekte / fehlende Gegenstände
-- Migration: 003_gaeste_meldungen
--
-- Ausführen: Supabase Dashboard → SQL Editor → komplett einfügen → Run
-- Kann gefahrlos mehrfach ausgeführt werden.
--
-- Gespeichert wird über die API-Route /api/public/report (mit Service Role),
-- deshalb gibt es hier KEINE Schreibrechte für anonyme Nutzer.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.item_reports (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      uuid        NOT NULL REFERENCES public.groups(id)    ON DELETE CASCADE,
  item_id       uuid        NOT NULL REFERENCES public.items(id)     ON DELETE CASCADE,
  kind          text        NOT NULL CHECK (kind IN ('defekt', 'fehlt', 'sonstiges')),
  message       text        CHECK (char_length(message) <= 500),
  reporter_name text        CHECK (char_length(reporter_name) <= 60),
  created_at    timestamptz NOT NULL DEFAULT now(),
  resolved_at   timestamptz
);

CREATE INDEX IF NOT EXISTS idx_item_reports_group ON public.item_reports(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_item_reports_item  ON public.item_reports(item_id) WHERE resolved_at IS NULL;

ALTER TABLE public.item_reports ENABLE ROW LEVEL SECURITY;

-- Gruppenmitglieder dürfen Meldungen ihrer Gruppe sehen …
DROP POLICY IF EXISTS item_reports_select_members ON public.item_reports;
CREATE POLICY item_reports_select_members
  ON public.item_reports FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = item_reports.group_id AND gm.user_id = auth.uid()
  ));

-- … und als erledigt markieren
DROP POLICY IF EXISTS item_reports_update_members ON public.item_reports;
CREATE POLICY item_reports_update_members
  ON public.item_reports FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = item_reports.group_id AND gm.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = item_reports.group_id AND gm.user_id = auth.uid()
  ));
