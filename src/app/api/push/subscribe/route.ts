import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { adminClient, sendPushToUser } from "@/lib/push";

export const runtime = "nodejs";

/** Gerät für Push-Benachrichtigungen anmelden */
export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  const admin = adminClient();
  if (!admin || !process.env.VAPID_PRIVATE_KEY || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    return NextResponse.json({ error: "Push ist auf dem Server noch nicht eingerichtet." }, { status: 500 });
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
