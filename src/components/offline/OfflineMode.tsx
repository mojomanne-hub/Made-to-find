"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WifiOff, Search, X, MapPin, Package, RefreshCw } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useGroup } from "@/lib/context/GroupContext";
import {
  saveSnapshot, loadSnapshot, normalize,
  type OfflineSnapshot, type OfflineItem, type OfflineLocation, type OfflineShelf,
} from "@/lib/offline/snapshot";

const SYNC_EVERY_MS = 10 * 60 * 1000;   // höchstens alle 10 Minuten neu laden
const MAX_ITEMS = 5000;

function isEmoji(s: string | null) {
  return !!s && /\p{Extended_Pictographic}/u.test(s);
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/**
 * Offline-Modus:
 *  - Online: lädt im Hintergrund eine Kopie aller Ablageorte und Gegenstände aufs Gerät.
 *  - Offline: zeigt einen Hinweis-Streifen und eine Suche, die nur diese Kopie benutzt.
 */
export function OfflineMode() {
  const { groups } = useGroup();
  const [online, setOnline]     = useState(true);
  const [userId, setUserId]     = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<OfflineSnapshot | null>(null);
  const [open, setOpen]         = useState(false);
  const [query, setQuery]       = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  // Bereich: "all" = alles, null = Meine Daten, sonst Gruppen-ID
  const [area, setArea]         = useState<string | null>("all");
  const syncing = useRef(false);

  // Angemeldeten Nutzer bestimmen – getSession funktioniert auch ohne Netz
  useEffect(() => {
    (async () => {
      const supabase = createBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      const id = session?.user?.id ?? null;
      setUserId(id);
      if (id) setSnapshot(loadSnapshot(id));
    })();
  }, []);

  const sync = useCallback(async (force = false) => {
    if (!userId || syncing.current || !navigator.onLine) return;
    const current = loadSnapshot(userId);
    if (!force && current && Date.now() - new Date(current.savedAt).getTime() < SYNC_EVERY_MS) return;
    syncing.current = true;
    try {
      const supabase = createBrowserClient();
      const [locs, shelves, items] = await Promise.all([
        supabase.from("locations").select("id, name, icon, color, group_id").is("deleted_at", null).order("name").limit(2000),
        supabase.from("shelves").select("id, name, location_id").limit(5000),
        supabase.from("items")
          .select("id, name, description, quantity, location_id, shelf_id, icon, image_url, barcode, expires_at, group_id")
          .is("deleted_at", null).order("name").limit(MAX_ITEMS),
      ]);
      if (locs.error || items.error) return;   // lieber die alte Kopie behalten als eine halbe
      const snap: OfflineSnapshot = {
        v: 1,
        userId,
        savedAt: new Date().toISOString(),
        groups: groups.map((g) => ({ id: g.id, name: g.name })),
        locations: (locs.data ?? []) as OfflineLocation[],
        shelves: (shelves.data ?? []) as OfflineShelf[],
        items: (items.data ?? []) as OfflineItem[],
      };
      if (saveSnapshot(snap)) setSnapshot(snap);
    } catch { /* ohne Netz oder Fehler: alte Kopie bleibt */ }
    finally { syncing.current = false; }
  }, [userId, groups]);

  // Bereich gewählt, während offline (aus Menü/Header): Offline-Suche für diesen Bereich öffnen
  useEffect(() => {
    const onArea = (e: Event) => {
      const groupId = (e as CustomEvent<{ groupId: string | null }>).detail?.groupId ?? null;
      setArea(groupId);
      setQuery("");
      setExpanded(null);
      setOpen(true);
    };
    window.addEventListener("mtf:offline-area", onArea);
    return () => window.removeEventListener("mtf:offline-area", onArea);
  }, []);

  // Online/Offline verfolgen und bei Gelegenheit aktualisieren
  useEffect(() => {
    const update = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) sync();
    };
    update();
    const onVisible = () => { if (document.visibilityState === "visible") update(); };
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [sync]);

  // Nach dem Speichern in der App (Seite wird neu geladen) ruhig aktualisieren
  useEffect(() => { if (userId) sync(); }, [userId, sync]);

  const lookup = useMemo(() => {
    const locs = new Map<string, OfflineLocation>();
    const shelves = new Map<string, OfflineShelf>();
    const groupNames = new Map<string, string>();
    snapshot?.locations.forEach((l) => locs.set(l.id, l));
    snapshot?.shelves.forEach((s) => shelves.set(s.id, s));
    snapshot?.groups.forEach((g) => groupNames.set(g.id, g.name));
    return { locs, shelves, groupNames };
  }, [snapshot]);

  const results = useMemo(() => {
    if (!snapshot) return [];
    const words = normalize(query).split(/\s+/).filter(Boolean);
    // Ohne Suchbegriff: bei gewähltem Bereich dessen Gegenstände auflisten
    if (words.length === 0 && area === "all") return [];
    return snapshot.items
      .filter((item) => area === "all" || (item.group_id ?? null) === area)
      .map((item) => {
        const loc = lookup.locs.get(item.location_id);
        const shelf = item.shelf_id ? lookup.shelves.get(item.shelf_id) : undefined;
        const haystack = normalize([item.name, item.description, item.barcode, loc?.name, shelf?.name].join(" "));
        const nameN = normalize(item.name);
        if (!words.every((w) => haystack.includes(w))) return null;
        const score = words.reduce((s, w) => s + (nameN.startsWith(w) ? 3 : nameN.includes(w) ? 2 : 1), 0);
        return { item, loc, shelf, score };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name, "de"))
      .slice(0, 200);
  }, [snapshot, query, lookup, area]);

  const areaName = (groupId: string | null) => (groupId ? lookup.groupNames.get(groupId) ?? "Gruppe" : "Meine Daten");

  if (online && !open) return null;

  return (
    <>
      {!online && (
        <div
          role="status"
          className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-amber-700/60 bg-amber-950/40 px-4 py-3 text-sm text-amber-200"
        >
          <WifiOff className="h-4 w-4 flex-shrink-0 text-amber-400" aria-hidden="true" />
          <span className="flex-1 min-w-[12rem]">
            Du bist offline. Anzeigen und Suchen geht{snapshot ? ` (Stand ${formatDate(snapshot.savedAt)})` : ""},
            Änderungen erst wieder mit Internet.
          </span>
          {snapshot && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-amber-400"
            >
              <Search className="h-4 w-4" aria-hidden="true" /> Offline suchen
            </button>
          )}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col" style={{ backgroundColor: "#0b1220" }} role="dialog" aria-modal="true" aria-label="Offline-Suche">
          <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
              <input
                autoFocus
                value={query}
                onChange={(e) => { setQuery(e.target.value); setExpanded(null); }}
                placeholder="Gegenstand, Ablageort oder Barcode …"
                aria-label="Offline suchen"
                autoComplete="off"
                className="input-base pl-9"
              />
            </div>
            <button
              type="button"
              onClick={() => { setOpen(false); setQuery(""); setArea("all"); }}
              aria-label="Suche schließen"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Bereich wählen */}
          {snapshot && (snapshot.groups.length > 0) && (
            <div className="flex gap-2 overflow-x-auto px-4 pt-3" role="group" aria-label="Bereich">
              {[{ id: "all", label: "Alle Bereiche" }, { id: null, label: "Meine Daten" }, ...snapshot.groups.map((g) => ({ id: g.id, label: g.name }))].map((opt) => {
                const active = area === opt.id;
                return (
                  <button
                    key={opt.id ?? "mine"}
                    type="button"
                    aria-pressed={active}
                    onClick={() => { setArea(opt.id); setExpanded(null); }}
                    className={
                      "flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                      (active ? "border-brand-500 bg-brand-600 text-white" : "border-slate-600 text-slate-300 hover:border-slate-400")
                    }
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 px-4 py-2 text-xs text-slate-500">
            <span>
              {snapshot
                ? `${snapshot.items.length} Gegenstände · Stand ${formatDate(snapshot.savedAt)}`
                : "Noch keine Offline-Kopie vorhanden"}
            </span>
            {online && (
              <button type="button" onClick={() => sync(true)} className="inline-flex items-center gap-1 text-brand-400 hover:text-brand-300">
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Aktualisieren
              </button>
            )}
          </div>

          <ul className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
            {query.trim() && results.length === 0 && (
              <li className="py-10 text-center text-sm text-slate-500">Nichts gefunden.</li>
            )}
            {!query.trim() && area !== "all" && results.length === 0 && (
              <li className="py-10 text-center text-sm text-slate-500">In diesem Bereich sind keine Gegenstände gespeichert.</li>
            )}
            {!query.trim() && area === "all" && (
              <li className="py-10 text-center text-sm text-slate-500">
                Tippe ein, was du suchst – zum Beispiel „Akkuschrauber“ oder „Keller“.
              </li>
            )}
            {results.map(({ item, loc, shelf }) => {
              const isOpen = expanded === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : item.id)}
                    aria-expanded={isOpen}
                    className="w-full text-left rounded-2xl border border-slate-700 px-3 py-2.5 hover:border-slate-500"
                    style={{ backgroundColor: "#1a2535" }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-xl bg-slate-800 flex items-center justify-center text-lg">
                        {item.image_url
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={item.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                          : isEmoji(item.icon) ? item.icon : <Package className="h-5 w-5 text-slate-400" aria-hidden="true" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-100">{item.name}</p>
                        <p className="flex items-center gap-1 truncate text-xs text-slate-400">
                          <MapPin className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                          {loc?.name ?? "Unbekannter Ablageort"}{shelf ? ` · ${shelf.name}` : ""}
                        </p>
                      </div>
                      {(item.quantity ?? 1) > 1 && (
                        <span className="flex-shrink-0 rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">{item.quantity}×</span>
                      )}
                    </div>
                    {isOpen && (
                      <div className="mt-3 space-y-1 border-t border-slate-700 pt-3 text-xs text-slate-300">
                        <p><span className="text-slate-500">Bereich:</span> {areaName(item.group_id)}</p>
                        <p><span className="text-slate-500">Ablageort:</span> {loc?.name ?? "—"}{shelf ? ` → ${shelf.name}` : ""}</p>
                        <p><span className="text-slate-500">Menge:</span> {item.quantity ?? 1}</p>
                        {item.expires_at && (
                          <p><span className="text-slate-500">Läuft ab:</span> {new Date(item.expires_at).toLocaleDateString("de-DE")}</p>
                        )}
                        {item.barcode && <p><span className="text-slate-500">Code:</span> <span className="font-mono">{item.barcode}</span></p>}
                        {item.description && <p className="whitespace-pre-line text-slate-400">{item.description}</p>}
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
