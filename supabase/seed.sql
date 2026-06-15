-- ============================================================
-- MaDe to find – Seed-Daten (nur für Entwicklung!)
-- Führe ERST die Migration 001_initial_schema.sql aus.
--
-- Hinweis: Ersetze 'DEINE_USER_ID' mit einer echten UUID
-- aus deiner auth.users Tabelle (nach erster Registrierung).
-- ============================================================

-- Beispiel-UUID (ersetzen!):
-- DO $$ DECLARE user_id uuid := 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'; BEGIN

DO $$
DECLARE
  uid   uuid;
  loc1  uuid;
  loc2  uuid;
  loc3  uuid;
  loc4  uuid;
BEGIN
  -- Ersten Benutzer aus auth.users nehmen (Entwicklung)
  SELECT id INTO uid FROM auth.users LIMIT 1;

  IF uid IS NULL THEN
    RAISE NOTICE 'Kein Benutzer gefunden. Erst registrieren, dann Seed ausführen.';
    RETURN;
  END IF;

  -- Ablageorte
  INSERT INTO public.locations (user_id, name, description, color)
  VALUES
    (uid, 'Keller – Regal A', 'Linkes Regal neben der Heizung, 5 Fächer', '#3b82f6')
  RETURNING id INTO loc1;

  INSERT INTO public.locations (user_id, name, description, color)
  VALUES
    (uid, 'Garage – Werkzeugschrank', 'Roter Schrank neben der Tür, 3 Schubladen', '#ef4444')
  RETURNING id INTO loc2;

  INSERT INTO public.locations (user_id, name, description, color)
  VALUES
    (uid, 'Büro – Aktenschrank', 'Grauer Schrank, Fach 2 von oben', '#6b7280')
  RETURNING id INTO loc3;

  INSERT INTO public.locations (user_id, name, description, color)
  VALUES
    (uid, 'Schlafzimmer – Schublade', 'Nachttisch, rechte Seite', '#10b981')
  RETURNING id INTO loc4;

  -- Artikel im Keller
  INSERT INTO public.items (user_id, location_id, name, description, quantity)
  VALUES
    (uid, loc1, 'Winterreifen',        '195/65 R15, Marke Continental',             4),
    (uid, loc1, 'Netzwerkkabel Cat6',  '10m, blau, neu verpackt',                   3),
    (uid, loc1, 'Verlängerungskabel',  '5m, 3-fach Steckdose',                      2),
    (uid, loc1, 'Weihnachtsdeko',      'Lichterketten und Kugeln in roter Kiste',   1);

  -- Artikel in der Garage
  INSERT INTO public.items (user_id, location_id, name, description, quantity)
  VALUES
    (uid, loc2, 'Akkuschrauber',       'Bosch GSR 12V-35, inkl. 2 Akkus',           1),
    (uid, loc2, 'Stichsäge',           'Makita JV0600K',                             1),
    (uid, loc2, 'Schraubenset',        'Torx + Kreuzschlitz, 400 Teile',            1),
    (uid, loc2, 'Fahrradschloss',      'Kryptonite Fahgettaboudit, Code 1234',      1),
    (uid, loc2, 'Motoröl 5W-30',       'Castrol Edge, 5 Liter, angebrochen',        1);

  -- Artikel im Büro
  INSERT INTO public.items (user_id, location_id, name, description, quantity)
  VALUES
    (uid, loc3, 'Reisepass',           'Läuft ab 2028-03-15',                       1),
    (uid, loc3, 'Geburtsurkunde',      'Original + 2 beglaubigte Kopien',           1),
    (uid, loc3, 'Garantieunterlagen',  'Waschmaschine + Fernseher',                 1),
    (uid, loc3, 'USB-Sticks',          'SanDisk 64GB, verschiedene Farben',         5);

  -- Artikel im Schlafzimmer
  INSERT INTO public.items (user_id, location_id, name, description, quantity)
  VALUES
    (uid, loc4, 'Kopfhörer',           'Sony WH-1000XM5, schwarz',                  1),
    (uid, loc4, 'Ladekabel USB-C',     'Original Apple, 1m',                        2);

  RAISE NOTICE 'Seed erfolgreich: 4 Ablageorte, 15 Artikel für Benutzer %', uid;
END;
$$;
