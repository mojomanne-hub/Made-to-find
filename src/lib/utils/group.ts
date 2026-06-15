/**
 * getActiveGroupId – liest den aktiven Gruppen-Kontext aus dem Cookie.
 * Wird in allen Server Components verwendet um die richtige Datenmenge zu laden.
 *
 * Gibt null zurück wenn "Meine Daten" aktiv ist.
 */

import { cookies } from "next/headers";

export async function getActiveGroupId(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get("active-group")?.value;
  // Nur gültige UUIDs akzeptieren
  if (!value || !/^[0-9a-f-]{36}$/.test(value)) return null;
  return value;
}
