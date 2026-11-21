/**
 * Gäste melden einen defekten / fehlenden Gegenstand (ohne Login, über den QR-Link).
 *
 * Ablauf: Token prüfen → Gegenstand gehört zu dieser Ferienwohnungs-Gruppe? → Missbrauchsschutz
 * → Meldung speichern → Glocke + Push an alle Gruppenmitglieder.
 * Läuft mit Service Role, deshalb brauchen anonyme Nutzer keine Schreibrechte in der Datenbank.
 */

import { NextRequest, NextResponse } from "next/server";
import { adminClient, sendPushToUser } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS = { defekt: "defekt", fehlt: "fehlt", sonstiges: "Sonstiges" } as const;
type Kind = keyof typeof KINDS;

const MAX_PER_HOUR = 15;   // pro Unterkunft

const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/[\u0000-\u001f]+/g, " ").trim().slice(0, max) : "";

export async function POST(req: NextRequest) {
  const admin = adminClient();
  if (!admin) return NextResponse.json({ error: "Server nicht konfiguriert." }, { status: 500 });

  const body = await req.json().catch(() => null);
  const token   = clean(body?.token, 64);
  const itemId  = clean(body?.item_id, 64);
  const kind    = clean(body?.kind, 20) as Kind;
  const message = clean(body?.message, 500);
  const name    = clean(body?.name, 60);

  // Honeypot: echtes Formular lässt dieses Feld leer, Spam-Bots füllen es aus
  if (clean(body?.website, 100)) return NextResponse.json({ success: true });

  if (!/^[a-f0-9]{32}$/.test(token) || !/^[0-9a-f-]{36}$/.test(itemId) || !(kind in KINDS)) {
    return NextResponse.json({ error: "Ungültige Angaben." }, { status: 400 });
  }

  // 1. Token → Gruppe (nur Ferienwohnungen)
  const { data: link } = await admin
    .from("group_public_links")
    .select("group_id, groups!inner(name, group_type)")
    .eq("token", token)
    .maybeSingle();
  const group = (link as { group_id: string; groups: { name: string; group_type: string } } | null);
  if (!group || group.groups.group_type !== "ferienwohnung") {
    return NextResponse.json({ error: "Dieser Link ist nicht mehr gültig." }, { status: 404 });
  }

  // 2. Gegenstand gehört zu dieser Gruppe?
  const { data: item } = await admin
    .from("items")
    .select("id, name, user_id, locations(name)")
    .eq("id", itemId)
    .eq("group_id", group.group_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!item) return NextResponse.json({ error: "Gegenstand nicht gefunden." }, { status: 404 });
  const it = item as unknown as { id: string; name: string; user_id: string; locations: { name: string } | null };

  // 3. Missbrauchsschutz: nicht mehr als X Meldungen pro Stunde und Unterkunft
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("item_reports")
    .select("id", { count: "exact", head: true })
    .eq("group_id", group.group_id)
    .gte("created_at", since);
  if ((count ?? 0) >= MAX_PER_HOUR) {
    return NextResponse.json({ error: "Gerade wurden sehr viele Meldungen geschickt. Bitte später noch einmal versuchen." }, { status: 429 });
  }

  // 4. Meldung speichern
  const { error: insErr } = await admin.from("item_reports").insert({
    group_id: group.group_id, item_id: it.id, kind,
    message: message || null, reporter_name: name || null,
  });
  if (insErr) {
    console.error("[report] Speichern fehlgeschlagen:", insErr.message);
    return NextResponse.json({ error: "Meldung konnte nicht gespeichert werden." }, { status: 500 });
  }

  // 5. Empfänger: alle Mitglieder der Gruppe
  const { data: gm } = await admin.from("group_members").select("user_id").eq("group_id", group.group_id);
  const recipients = [...new Set([...(gm ?? []).map((m) => m.user_id as string), it.user_id])];

  const where = it.locations?.name ? ` (${it.locations.name})` : "";
  const who   = name ? `${name}: ` : "";
  const title = `Gast meldet: ${it.name} ${kind === "sonstiges" ? "– Hinweis" : KINDS[kind]}`;
  const text  = `${group.groups.name}${where}${message ? ` – ${who}${message}` : name ? ` – von ${name}` : ""}`;

  const { error: nErr } = await admin.from("notifications").insert(recipients.map((uid) => ({
    user_id: uid, group_id: group.group_id, type: "item_report",
    title: title.slice(0, 120), message: text.slice(0, 300),
  })));
  if (nErr) console.error("[report] Glocke fehlgeschlagen:", nErr.message);

  await Promise.all(recipients.map((uid) =>
    sendPushToUser(admin, uid, {
      title: title.slice(0, 80), body: text.slice(0, 200), url: `/items/${it.id}`, tag: `report-${it.id}`,
    }).catch(() => 0)
  ));

  return NextResponse.json({ success: true });
}
