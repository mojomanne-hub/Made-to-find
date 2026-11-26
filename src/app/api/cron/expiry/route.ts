import { NextRequest, NextResponse } from "next/server";
import { adminClient, sendPushToUser, checkSecret } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Datum in deutscher Zeit als YYYY-MM-DD, optional um Tage verschoben */
function berlinDate(offsetDays = 0): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
const deDate = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;

interface Row { id: string; name: string; user_id: string; group_id: string | null; expires_at: string }
interface Hit { id: string; name: string; today: boolean; date: string; groupId: string | null; days: number }

const MAX_LEAD_DAYS = 30;
const DEFAULT_LEAD_DAYS = 7;

/**
 * Täglicher Lauf (Vercel Cron, siehe vercel.json): meldet Gegenstände, die HEUTE ablaufen oder in so vielen Tagen,
 * wie der jeweilige Nutzer eingestellt hat (Stift an der Glocke; Standard 7 Tage).
 * Pro Gegenstand ein Eintrag in der Glocke, pro Nutzer EINE gebündelte Push-Meldung.
 */
export async function GET(req: NextRequest) {
  const denied = checkSecret(req.headers.get("authorization"));
  if (denied) {
    console.warn("[push] Zugriff abgelehnt:", denied);   // Grund nur im Vercel-Log, nicht in der Antwort
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = adminClient();
  if (!admin) return NextResponse.json({ error: "Server nicht konfiguriert." }, { status: 500 });

  const today = berlinDate(0);
  const maxDate = berlinDate(MAX_LEAD_DAYS);
  // Datum → Anzahl Tage bis dahin
  const dayIndex = new Map<string, number>();
  for (let i = 0; i <= MAX_LEAD_DAYS; i++) dayIndex.set(berlinDate(i), i);

  const { data, error } = await admin
    .from("items")
    .select("id, name, user_id, group_id, expires_at")
    .is("deleted_at", null)
    .gte("expires_at", today)
    .lte("expires_at", `${maxDate}T23:59:59`)
    .limit(5000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = ((data ?? []) as Row[]).filter((r) => dayIndex.has(String(r.expires_at).slice(0, 10)));

  // Empfänger: bei Gruppen alle Mitglieder, sonst der Besitzer
  const groupIds = [...new Set(rows.map((r) => r.group_id).filter((g): g is string => !!g))];
  const members = new Map<string, string[]>();
  if (groupIds.length > 0) {
    const { data: gm } = await admin.from("group_members").select("group_id, user_id").in("group_id", groupIds);
    for (const m of gm ?? []) members.set(m.group_id, [...(members.get(m.group_id) ?? []), m.user_id]);
  }

  const perUser = new Map<string, Hit[]>();
  for (const r of rows) {
    const date = String(r.expires_at).slice(0, 10);
    const recipients = r.group_id ? new Set([...(members.get(r.group_id) ?? []), r.user_id]) : new Set([r.user_id]);
    for (const uid of recipients) {
      perUser.set(uid, [...(perUser.get(uid) ?? []), { id: r.id, name: r.name, today: date === today, date, groupId: r.group_id, days: dayIndex.get(date) ?? 0 }]);
    }
  }

  // Persönliche Einstellungen (Vorwarnzeit, Erinnerung am Ablauftag)
  const prefs = new Map<string, { days: number; onDay: boolean; enabled: boolean }>();
  const userIds = [...perUser.keys()];
  if (userIds.length > 0) {
    const { data: ps } = await admin
      .from("notification_settings").select("*").in("user_id", userIds);
    for (const p of ps ?? []) prefs.set(p.user_id, { days: p.expiry_days_before ?? DEFAULT_LEAD_DAYS, onDay: p.expiry_on_day ?? true, enabled: p.notify_expiring ?? true });
  }

  let notified = 0, pushed = 0;
  for (const [uid, allHits] of perUser) {
    const pref = prefs.get(uid) ?? { days: DEFAULT_LEAD_DAYS, onDay: true, enabled: true };
    if (!pref.enabled) continue;
    const hits = allHits.filter((h) => (h.today ? pref.onDay : h.days === pref.days));
    if (hits.length === 0) continue;

    // Schon heute gemeldet? (schützt vor doppelten Einträgen, falls der Lauf zweimal startet)
    const since = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await admin
      .from("notifications").select("message")
      .eq("user_id", uid).eq("type", "item_expiring").gte("created_at", since);
    const seen = new Set((existing ?? []).map((n) => n.message));

    const fresh = hits.filter((h) => !seen.has(`${h.name} läuft am ${deDate(h.date)} ab.`));
    if (fresh.length === 0) continue;

    await admin.from("notifications").insert(fresh.map((h) => ({
      user_id: uid, group_id: h.groupId, type: "item_expiring",
      title: h.today ? "Läuft heute ab" : "Bald ablaufend",
      message: `${h.name} läuft am ${deDate(h.date)} ab.`,
    })));
    notified += fresh.length;

    const first = fresh[0];
    const body = fresh.length === 1
      ? `${first.name} läuft ${first.today ? "heute" : first.days === 1 ? "morgen" : `in ${first.days} Tagen`} ab.`
      : `${fresh.length} Gegenstände: ${fresh.slice(0, 3).map((h) => h.name).join(", ")}${fresh.length > 3 ? " …" : ""}`;
    pushed += await sendPushToUser(admin, uid, {
      title: fresh.some((h) => h.today) ? "Läuft heute ab" : "Läuft bald ab",
      body,
      url: fresh.length === 1 ? `/items/${first.id}` : "/dashboard",
      tag: "expiry",
    });
  }

  const lent = await remindLentItems(admin, today);
  return NextResponse.json({ success: true, items: rows.length, notified, pushed, lent });
}

/**
 * Verliehene Gegenstände: Erinnerung am vereinbarten Rückgabetag und, falls noch nicht zurück,
 * eine Woche später noch einmal. Empfänger: Besitzer bzw. alle Gruppenmitglieder.
 */
async function remindLentItems(admin: NonNullable<ReturnType<typeof adminClient>>, today: string) {
  const weekAgo = berlinDate(-7);
  const { data, error } = await admin
    .from("items")
    .select("id, name, user_id, group_id, lent_to, lent_until")
    .is("deleted_at", null)
    .not("lent_to", "is", null)
    .in("lent_until", [today, weekAgo])
    .limit(2000);
  if (error || !data || data.length === 0) return { items: 0, notified: 0, pushed: 0 };

  type LentRow = { id: string; name: string; user_id: string; group_id: string | null; lent_to: string; lent_until: string };
  const rows = data as LentRow[];

  const groupIds = [...new Set(rows.map((r) => r.group_id).filter((g): g is string => !!g))];
  const members = new Map<string, string[]>();
  if (groupIds.length > 0) {
    const { data: gm } = await admin.from("group_members").select("group_id, user_id").in("group_id", groupIds);
    for (const m of gm ?? []) members.set(m.group_id, [...(members.get(m.group_id) ?? []), m.user_id]);
  }

  const perUser = new Map<string, LentRow[]>();
  for (const r of rows) {
    const recipients = r.group_id ? new Set([...(members.get(r.group_id) ?? []), r.user_id]) : new Set([r.user_id]);
    for (const uid of recipients) perUser.set(uid, [...(perUser.get(uid) ?? []), r]);
  }

  // Wer die Rückgabe-Erinnerung abgeschaltet hat, bekommt keine
  const { data: ps } = await admin.from("notification_settings").select("user_id, notify_lent_due").in("user_id", [...perUser.keys()]);
  const off = new Set((ps ?? []).filter((p) => p.notify_lent_due === false).map((p) => p.user_id));

  let notified = 0, pushed = 0;
  const since = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();
  for (const [uid, list] of perUser) {
    if (off.has(uid)) continue;
    const { data: existing } = await admin
      .from("notifications").select("message")
      .eq("user_id", uid).eq("type", "item_lent_due").gte("created_at", since);
    const seen = new Set((existing ?? []).map((n) => n.message));
    const msg = (r: LentRow) => r.lent_until === today
      ? `${r.name} sollte heute von ${r.lent_to} zurückkommen.`
      : `${r.name} ist seit einer Woche überfällig (verliehen an ${r.lent_to}).`;
    const fresh = list.filter((r) => !seen.has(msg(r)));
    if (fresh.length === 0) continue;

    await admin.from("notifications").insert(fresh.map((r) => ({
      user_id: uid, group_id: r.group_id, type: "item_lent_due",
      title: r.lent_until === today ? "Rückgabe heute" : "Rückgabe überfällig",
      message: msg(r),
    })));
    notified += fresh.length;

    const first = fresh[0];
    pushed += await sendPushToUser(admin, uid, {
      title: fresh.length === 1 ? (first.lent_until === today ? "Rückgabe heute" : "Rückgabe überfällig") : "Verliehene Gegenstände",
      body: fresh.length === 1 ? msg(first) : `${fresh.length} Gegenstände sollten zurückkommen: ${fresh.slice(0, 3).map((r) => r.name).join(", ")}${fresh.length > 3 ? " …" : ""}`,
      url: fresh.length === 1 ? `/items/${first.id}` : "/items",
      tag: "lent-due",
    });
  }
  return { items: rows.length, notified, pushed };
}
