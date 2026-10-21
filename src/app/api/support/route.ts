import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

/**
 * POST /api/support
 * Nimmt eine Support-Nachricht eingeloggter Nutzer entgegen und schickt sie
 * über Resend an die Support-Adresse. Antworten gehen direkt an den Nutzer (Reply-To).
 *
 * Benötigte Umgebungsvariablen (Vercel):
 *   RESEND_API_KEY      – API-Schlüssel von Resend (Senderecht reicht)
 *   SUPPORT_TO_EMAIL    – optional, Standard: madetofind@web.de
 *   SUPPORT_FROM_EMAIL  – optional, Standard: MaDe to find Support <noreply@madetofind.de>
 */

const TO_EMAIL   = process.env.SUPPORT_TO_EMAIL   ?? "madetofind@web.de";
const FROM_EMAIL = process.env.SUPPORT_FROM_EMAIL ?? "MaDe to find Support <noreply@madetofind.de>";

const CATEGORY_LABEL: Record<string, string> = {
  question: "Frage",
  bug:      "Fehler",
  idea:     "Idee",
};

const MIN_LENGTH = 10;
const MAX_LENGTH = 2000;

// Einfache Sperre pro Nutzer: max. 3 Nachrichten in 10 Minuten.
// (Läuft pro Server-Instanz; für Missbrauchsschutz im Alltag ausreichend.)
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 3;
const recent = new Map<string, number[]>();

function isRateLimited(userId: string): boolean {
  const now  = Date.now();
  const list = (recent.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= MAX_PER_WINDOW) {
    recent.set(userId, list);
    return true;
  }
  list.push(now);
  recent.set(userId, list);
  return false;
}

export async function POST(request: Request) {
  // 1. Nur eingeloggte Nutzer
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Bitte melde dich an." }, { status: 401 });
  }

  // 2. Eingabe prüfen
  let body: { category?: unknown; message?: unknown; website?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  // Honeypot: Bots füllen das versteckte Feld aus – still "erfolgreich" antworten
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const category = typeof body.category === "string" && body.category in CATEGORY_LABEL
    ? body.category
    : "question";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (message.length < MIN_LENGTH) {
    return NextResponse.json({ error: "Bitte beschreibe dein Anliegen etwas genauer." }, { status: 400 });
  }
  if (message.length > MAX_LENGTH) {
    return NextResponse.json({ error: "Die Nachricht ist zu lang." }, { status: 400 });
  }

  // 3. Missbrauchsschutz
  if (isRateLimited(user.id)) {
    return NextResponse.json({ error: "Zu viele Nachrichten." }, { status: 429 });
  }

  // 4. Konfiguration prüfen
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[support] RESEND_API_KEY fehlt");
    return NextResponse.json({ error: "Support ist gerade nicht erreichbar. Bitte schreibe uns direkt per E-Mail." }, { status: 500 });
  }

  const userEmail = user.email ?? "unbekannt";
  const userAgent = request.headers.get("user-agent") ?? "unbekannt";

  const text = [
    message,
    "",
    "――――――――――――――――",
    `Kategorie:  ${CATEGORY_LABEL[category]}`,
    `Nutzer:     ${userEmail}`,
    `Nutzer-ID:  ${user.id}`,
    `Gerät:      ${userAgent}`,
  ].join("\n");

  // 5. Über Resend senden
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:     FROM_EMAIL,
        to:       [TO_EMAIL],
        reply_to: user.email ?? undefined,
        subject:  `[Support – ${CATEGORY_LABEL[category]}] ${userEmail}`,
        text,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[support] Resend-Fehler", res.status, detail);
      return NextResponse.json({ error: "Das Senden hat leider nicht geklappt. Bitte versuche es später noch einmal." }, { status: 502 });
    }
  } catch (err) {
    console.error("[support] Senden fehlgeschlagen", err);
    return NextResponse.json({ error: "Das Senden hat leider nicht geklappt. Bitte versuche es später noch einmal." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
