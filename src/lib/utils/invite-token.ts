/**
 * invite-token.ts
 *
 * Speichert einen ausstehenden Einladungstoken in sessionStorage.
 * Wird nach Login/Registrierung ausgelesen und die Gruppe beigetreten.
 *
 * Flow:
 * 1. User öffnet /join/[token] ohne Account
 * 2. Token wird in sessionStorage gespeichert
 * 3. User registriert sich / loggt sich ein
 * 4. Nach Auth: Token auslesen → Gruppe beitreten → Token löschen
 */

const KEY = "pending-invite-token";

export function savePendingInviteToken(token: string) {
  try {
    sessionStorage.setItem(KEY, token);
  } catch { /* ignorieren */ }
}

export function getPendingInviteToken(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch { return null; }
}

export function clearPendingInviteToken() {
  try {
    sessionStorage.removeItem(KEY);
  } catch { /* ignorieren */ }
}

/**
 * Tritt einer Gruppe bei falls ein Token gespeichert ist.
 * Gibt die group_id zurück wenn erfolgreich, sonst null.
 */
export async function joinPendingGroup(
  supabase: ReturnType<typeof import("@/lib/supabase/client").createBrowserClient>
): Promise<string | null> {
  const token = getPendingInviteToken();
  if (!token) return null;

  try {
    const { data: groupId, error } = await supabase.rpc("join_group_by_token", { token });
    if (error) throw error;
    clearPendingInviteToken();
    return groupId as string;
  } catch (err) {
    console.error("Gruppe beitreten fehlgeschlagen:", err);
    clearPendingInviteToken(); // Token trotzdem löschen damit kein Loop entsteht
    return null;
  }
}
