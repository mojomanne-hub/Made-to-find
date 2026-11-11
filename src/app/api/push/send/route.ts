import { NextRequest, NextResponse } from "next/server";
import { adminClient, sendPushToUser, checkSecret } from "@/lib/push";

export const runtime = "nodejs";

/**
 * Wird von der Datenbank aufgerufen (z. B. bei einer neuen Registrierung) und schickt
 * eine Push-Meldung an einen Nutzer. Geschützt über CRON_SECRET.
 */
export async function POST(req: NextRequest) {
  const denied = checkSecret(req.headers.get("authorization"));
  if (denied) return NextResponse.json({ error: "Unauthorized", hint: denied }, { status: 401 });
  const admin = adminClient();
  if (!admin) return NextResponse.json({ error: "Server nicht konfiguriert." }, { status: 500 });

  const body = await req.json().catch(() => null);
  const userId = body?.user_id;
  const title  = body?.title;
  const text   = body?.body;
  if (typeof userId !== "string" || typeof title !== "string" || typeof text !== "string") {
    return NextResponse.json({ error: "Ungültige Daten." }, { status: 400 });
  }
  const url = typeof body?.url === "string" && body.url.startsWith("/") ? body.url : "/dashboard";

  const sent = await sendPushToUser(admin, userId, {
    title: title.slice(0, 80), body: text.slice(0, 200), url,
    tag: typeof body?.tag === "string" ? body.tag.slice(0, 40) : undefined,
  });
  return NextResponse.json({ success: true, sent });
}
