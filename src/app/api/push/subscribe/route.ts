import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { adminClient, sendPushToUser } from "@/lib/push";

export const runtime = "nodejs";

/** Gerät für Push-Benachrichtigungen anmelden */
export async function POST(req: NextRequest) {
  try {
    return await subscribe(req);
  } catch (err) {
    // Immer eine lesbare Fehlermeldung zurückgeben statt einer leeren 500-Antwort
    console.error("Push-Anmeldung fehlgeschlagen:", err);
    return NextResponse.json({ error: `Serverfehler: ${err instanceof Error ? err.message : "unbekannt"}` }, { status: 500 });
  }
}

async function subscribe(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  // Fehlende Einstellungen beim Namen nennen (nur die Namen, nie die Werte)
  const missing = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"]
    .filter((name) => !(process.env[name] ?? "").trim());
  const admin = adminClient();
  if (!admin || missing.length > 0) {
    return NextResponse.json(
      { error: `Push ist auf dem Server noch nicht eingerichtet. Bei Vercel fehlt: ${missing.join(", ") || "unbekannt"}` },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);
  const endpoint = body?.endpoint;
  const p256dh   = body?.keys?.p256dh;
  const auth     = body?.keys?.auth;
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://") || endpoint.length > 2000
      || typeof p256dh !== "string" || typeof auth !== "string") {
    return NextResponse.json({ error: "Ungültige Daten." }, { status: 400 });
  }

  // Ein Gerät gehört immer dem Konto, das sich zuletzt darauf angemeldet hat
  const { error } = await admin
    .from("push_subscriptions")
    .upsert({ user_id: user.id, endpoint, p256dh, auth }, { onConflict: "endpoint" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const errors: string[] = [];
  const sent = await sendPushToUser(admin, user.id, {
    title: "Benachrichtigungen sind aktiv",
    body:  "So sehen Meldungen von MaDe to find auf diesem Gerät aus.",
    url:   "/dashboard",
    tag:   "push-test",
  }, errors);
  return NextResponse.json({ success: true, sent, errors: errors.slice(0, 3) });
}

/** Gerät wieder abmelden */
export async function DELETE(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  const admin = adminClient();
  if (!admin) return NextResponse.json({ error: "Server nicht konfiguriert." }, { status: 500 });

  const body = await req.json().catch(() => null);
  if (typeof body?.endpoint !== "string") return NextResponse.json({ error: "Ungültige Daten." }, { status: 400 });

  await admin.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", body.endpoint);
  return NextResponse.json({ success: true });
}
