-- ============================================================
-- MaDe to find – Eigene Benachrichtigungen löschen dürfen
-- Migration: 004_benachrichtigungen_loeschen
--
-- Ausführen: Supabase Dashboard → SQL Editor → komplett einfügen → Run
-- Kann gefahrlos mehrfach ausgeführt werden.
-- ============================================================

DROP POLICY IF EXISTS notifications_delete_own ON public.notifications;
CREATE POLICY notifications_delete_own
  ON public.notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
