import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Räumt Bilddateien im Storage auf.
 *
 * Löscht eine Datei NUR, wenn sie von keinem Gegenstand / Ablageort mehr verwendet wird.
 * So können auch Gruppenmitglieder Fotos aufräumen, die ein anderes Mitglied hochgeladen hat,
 * ohne dass die Storage-Regeln gelockert werden müssen.
 */

const BUCKET_TABLE: Record<string, "items" | "locations"> = {
  "item-images": "items",
  "location-images": "locations",
};

// Erwartetes Format: <nutzer-id>/<datei-id>.<endung>
const PATH_RE = /^[A-Za-z0-9-]+\/[A-Za-z0-9-]+\.(jpg|jpeg|png|webp|gif)$/i;

export async function POST(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "Server nicht konfiguriert (Service Role Key fehlt)." },
      { status: 500 }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Nur angemeldete Nutzer
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) {
    return NextResponse.json({ error: "Ungültige Sitzung." }, { status: 401 });
  }

  let body: { bucket?: unknown; paths?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const bucket = typeof body.bucket === "string" ? body.bucket : "";
  const table = BUCKET_TABLE[bucket];
  if (!table) {
    return NextResponse.json({ error: "Ungültiger Bucket." }, { status: 400 });
  }

  if (!Array.isArray(body.paths) || body.paths.length === 0 || body.paths.length > 200) {
    return NextResponse.json({ error: "Ungültige Pfade." }, { status: 400 });
  }
  const paths = Array.from(
    new Set(body.paths.filter((p): p is string => typeof p === "string" && PATH_RE.test(p)))
  );
  if (paths.length === 0) {
    return NextResponse.json({ removed: 0 });
  }

  try {
    // Nur Dateien löschen, die nirgends mehr referenziert werden
    const deletable: string[] = [];
    for (const path of paths) {
      const { count, error } = await supabaseAdmin
        .from(table)
        .select("id", { count: "exact", head: true })
        .like("image_url", `%/${bucket}/${path}%`);
      if (error) {
        console.error("Referenzprüfung fehlgeschlagen:", error.message);
        continue; // im Zweifel nicht löschen
      }
      if (count === 0) deletable.push(path);
    }

    if (deletable.length > 0) {
      const { error } = await supabaseAdmin.storage.from(bucket).remove(deletable);
      if (error) throw error;
    }

    return NextResponse.json({ removed: deletable.length });
  } catch (err) {
    console.error("Storage-Aufräumen fehlgeschlagen:", err);
    return NextResponse.json({ error: "Aufräumen fehlgeschlagen." }, { status: 500 });
  }
}
