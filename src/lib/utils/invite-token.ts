/**
 * invite-token.ts
 *
 * Merkt sich einen ausstehenden Einladungstoken, bis der Nutzer angemeldet ist.
 *
 * Gespeichert wird in einem Cookie UND in localStorage (jeweils 7 Tage). Früher lag der Token
 * nur in sessionStorage – der geht verloren, sobald die Anmeldung in einem anderen Tab oder
 * Browser-Fenster weiterläuft (z. B. Google-Anmeldung aus der Android-App heraus).
 *
 * Flow:
 * 1. User öffnet /join/[token] ohne Account
 * 2. Token wird gespeichert
 * 3. User registriert sich / loggt sich ein (E-Mail oder Google)
 * 4. Nach Auth: Token auslesen → Gruppe beitreten → Token löschen
 */

const KEY = "pending-invite-token";
const MAX_AGE_S = 60 * 60 * 24 * 7;
const VALID = /^[A-Za-z0-9_-]{4,200}$/;

function readCookie(): string | null {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${KEY}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : null;
  } catch { return null; }
}

export function savePendingInviteToken(token: string) {
  if (!VALID.test(token)) return;
  try { document.cookie = `${KEY}=${encodeURIComponent(token)}; path=/; max-age=${MAX_AGE_S}; SameSite=Lax`; } catch { /* ignorieren */ }
  try { localStorage.setItem(KEY, JSON.stringify({ token, at: Date.now() })); } catch { /* ignorieren */ }
}

export function getPendingInviteToken(): string | null {
  if (typeof document === "undefined") return null;
  const fromCookie = readCookie();
  if (fromCookie && VALID.test(fromCookie)) return fromCookie;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const { token, at } = JSON.parse(raw) as { token?: string; at?: number };
      if (token && VALID.test(token) && at && Date.now() - at < MAX_AGE_S * 1000) return token;
    }
  } catch { /* ignorieren */ }
  try {
    const old = sessionStorage.getItem(KEY);   // Altbestand
    if (old && VALID.test(old)) return old;
  } catch { /* ignorieren */ }
  return null;
}

export function clearPendingInviteToken() {
  try { document.cookie = `${KEY}=; path=/; max-age=0; SameSite=Lax`; } catch { /* ignorieren */ }
  try { localStorage.removeItem(KEY); } catch { /* ignorieren */ }
  try { sessionStorage.removeItem(KEY); } catch { /* ignorieren */ }
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
    // Noch nicht angemeldet → Token behalten und später erneut versuchen
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

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
