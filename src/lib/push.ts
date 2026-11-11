/**
 * Push-Benachrichtigungen (Web Push) – nur serverseitig verwenden.
 * Benötigt die Umgebungsvariablen NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
 * und SUPABASE_SERVICE_ROLE_KEY.
 */
import webpush from "web-push";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface PushPayload {
  title: string;
  body:  string;
  url?:  string;   // Seite, die beim Antippen geöffnet wird
  tag?:  string;   // gleiche tag = neuere Meldung ersetzt die ältere
}

/** Supabase-Client mit Service Role (umgeht RLS) – oder null, wenn nicht konfiguriert */
export function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

let configured = false;
function configure(): boolean {
  if (configured) return true;
  const pub  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "https://www.madetofind.de", pub, priv);
  configured = true;
  return true;
}

/** Schickt eine Meldung an alle Geräte eines Nutzers. Gibt die Anzahl erfolgreicher Zustellungen zurück. */
export async function sendPushToUser(
  admin: SupabaseClient, userId: string, payload: PushPayload,
  errors?: string[],   // optional: sammelt Fehlermeldungen des Push-Dienstes (für die Testmeldung)
): Promise<number> {
  if (!configure()) return 0;
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  let sent = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
        { TTL: 60 * 60 * 24 }
      );
      sent++;
    } catch (err) {
      // 404/410 = Gerät hat die Erlaubnis entzogen oder das Abo ist abgelaufen → aufräumen
      const status = (err as { statusCode?: number }).statusCode;
      errors?.push(status ? `Push-Dienst antwortet mit ${status}` : (err instanceof Error ? err.message : "Unbekannter Fehler"));
      if (status === 404 || status === 410) {
        await admin.from("push_subscriptions").delete().eq("id", s.id);
      }
    }
  }
  return sent;
}
