/**
 * Gäste-Ansicht (Ferienwohnung): Daten laden, die über den QR-Code öffentlich sichtbar sind.
 * Läuft über die Datenbank-Funktion get_public_inventory – die Tabellen selbst bleiben gesperrt.
 */

import { cache } from "react";
import { createServerClient } from "@/lib/supabase/server";

export interface PublicLocation {
  id: string; name: string; description: string | null;
  color: string | null; icon: string | null; image_url: string | null;
}
export interface PublicShelf { id: string; location_id: string; name: string; position: number }
export interface PublicItem {
  id: string; location_id: string; shelf_id: string | null;
  name: string; description: string | null; quantity: number;
  icon: string | null; color: string | null; image_url: string | null;
}
export interface PublicInventory {
  group_name: string;
  locations:  PublicLocation[];
  shelves:    PublicShelf[];
  items:      PublicItem[];
}

export const TOKEN_PATTERN = /^[a-f0-9]{32}$/;

/** Pro Seitenaufruf nur einmal abfragen (Metadaten + Seite teilen sich das Ergebnis) */
export const getPublicInventory = cache(async (token: string): Promise<PublicInventory | null> => {
  if (!TOKEN_PATTERN.test(token)) return null;
  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("get_public_inventory", { p_token: token });
  if (error || !data) return null;
  return data as PublicInventory;
});
