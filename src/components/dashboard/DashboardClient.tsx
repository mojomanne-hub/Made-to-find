"use client";

/**
 * DashboardClient – komplettes Dashboard als Client Component.
 * Enthält: Suche, Schnellaktionen, Statistiken, Ablageorte, Zuletzt hinzugefügt.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import * as LucideIcons from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useDebounce }         from "@/lib/hooks";
import { ROUTES, SEARCH_MIN_LENGTH, SEARCH_DEBOUNCE_MS } from "@/lib/constants";
import { formatRelativeDate }  from "@/lib/utils";
import { Card }   from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { openScanner } from "@/components/scanner/scanner-events";
// import { AdBanner } from "@/components/ads/AdBanner"; // Banner pausiert bis AdSense freigegeben ist

// Dynamisches Icon-Rendering mit Emoji-Unterstützung
function DynIcon({ name, className }: { name: string | null; className?: string }) {
  if (!name) return <LucideIcons.Box className={className} />;
  
  // Emoji-Erkennung: max 4 Zeichen und nicht mit Großbuchstaben (Lucide-Icon-Namen)
  const isEmoji = name.length <= 4 && !/^[A-Z]/.test(name);
  
  if (isEmoji) {
    return <span className="text-2xl leading-none">{name}</span>;
  }
  
  const Icon = (LucideIcons as unknown as Record<string, React.FC<{ className?: string }>>)[name];
  const Comp = Icon ?? LucideIcons.Box;
  return <Comp className={className} />;
}

interface Location {
  id: string; name: string; color: string | null;
  icon: string | null; image_url: string | null; updated_at: string;
}

interface RecentItem {
  id: string; name: string; icon: string | null; image_url: string | null;
  updated_at: string;
  locations: { name: string; color: string | null } | null;
}

interface SearchRow {
  kind: string; id: string; name: string;
  location_name: string; quantity: number | null;
}

interface ExpiringItem {
  id:         string;
  name:       string;
  expires_at: string;
}

interface Props {
  locationCount:  number;
  itemCount:      number;
  locations:      Location[];
  recentItems:    RecentItem[];
  groupId:        string | null;
  expiringItems:  ExpiringItem[];  // NEU
  itemCounts?:    Record<string, number>;
}

export function DashboardClient({ locationCount, itemCount, locations, recentItems, groupId, expiringItems, itemCounts = {} }: Props) {
  const [query,       setQuery]       = useState("");
  const [results,     setResults]     = useState<SearchRow[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS);

  // Echtzeit-Suche
  useEffect(() => {
    if (debouncedQuery.trim().length < SEARCH_MIN_LENGTH) {
      setResults([]);
      return;
    }
    async function search() {
      setIsSearching(true);
      try {
        const supabase = createBrowserClient();
        const q = debouncedQuery.trim();
        let iQ = supabase.from("items")
            .select("id, name, quantity, location_id, locations(name)")
            .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
            .is("deleted_at", null).limit(8);
          let lQ = supabase.from("locations")
            .select("id, name")
            .ilike("name", `%${q}%`)
            .is("deleted_at", null).limit(5);
          if (groupId) {
            iQ = iQ.eq("group_id", groupId);
            lQ = lQ.eq("group_id", groupId);
          }
          const [{ data: items }, { data: locs }] = await Promise.all([iQ, lQ]);
        const itemRows: SearchRow[] = (items ?? []).map((i) => ({
          kind: "item", id: i.id, name: i.name, quantity: i.quantity,
          location_name: (i.locations as unknown as { name: string } | null)?.name ?? "–",
        }));
        const locRows: SearchRow[] = (locs ?? []).map((l) => ({
          kind: "location", id: l.id, name: l.name, quantity: null, location_name: "",
        }));
        setResults([...itemRows, ...locRows]);
      } finally { setIsSearching(false); }
    }
    search();
  }, [debouncedQuery]);

  const showResults = query.trim().length >= SEARCH_MIN_LENGTH;

  const nextExpiry = expiringItems[0];
  function daysLeft(d: string) {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const e = new Date(d); e.setHours(0, 0, 0, 0);
    return Math.ceil((e.getTime() - t.getTime()) / 86400000);
  }

  return (
    <div className="space-y-5">

      {/* ── Titel ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-50">Deine Übersicht</h1>
        <p className="text-sm text-slate-500 mt-0.5">{groupId ? "Gemeinsame Gruppe" : "Persönlicher Bereich"}</p>
      </div>

      {/* ── Suchleiste ── */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
          <LucideIcons.Search className="h-4 w-4" />
        </div>
        <input
          type="search"
          placeholder="Nach Name, Ablageorte, Gegenstand oder Beschreibung suchen..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full h-11 rounded-2xl pl-11 pr-4 text-sm bg-[#1a2535] border border-slate-700 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            <LucideIcons.X className="h-4 w-4" />
          </button>
        )}

        {/* Suchergebnisse Dropdown */}
        {showResults && (
          <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-slate-700 overflow-hidden z-50 shadow-xl"
            style={{ backgroundColor: "#1a2535" }}>
            {isSearching ? (
              <div className="flex items-center justify-center py-6">
                <LucideIcons.Loader2 className="h-5 w-5 text-brand-400 animate-spin" />
              </div>
            ) : results.length === 0 ? (
              <p className="px-4 py-4 text-sm text-slate-500 text-center">
                Keine Ergebnisse für „{query}"
              </p>
            ) : (
              <ul>
                {results.map((r) => (
                  <li key={`${r.kind}-${r.id}`}>
                    <Link
                      href={r.kind === "item" ? ROUTES.itemDetail(r.id) : ROUTES.locationDetail(r.id)}
                      onClick={() => setQuery("")}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="h-7 w-7 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                        {r.kind === "item"
                          ? <LucideIcons.Package className="h-3.5 w-3.5 text-slate-400" />
                          : <LucideIcons.MapPin  className="h-3.5 w-3.5 text-brand-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">{r.name}</p>
                        {r.kind === "item" && (
                          <p className="text-xs text-slate-500 truncate">{r.location_name}</p>
                        )}
                      </div>
                      {r.quantity !== null && (
                        <span className="text-xs text-slate-500">{r.quantity}×</span>
                      )}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href={`${ROUTES.search}?q=${encodeURIComponent(query)}`}
                    onClick={() => setQuery("")}
                    className="flex items-center justify-center gap-2 px-4 py-3 text-xs text-brand-400 hover:text-brand-300 hover:bg-slate-700/30 transition-colors border-t border-slate-700"
                  >
                    Alle Ergebnisse anzeigen
                    <LucideIcons.ArrowRight className="h-3 w-3" />
                  </Link>
                </li>
              </ul>
            )}
          </div>
        )}
      </div>

      {/* ── Zähler ── */}
      <div className="grid grid-cols-2 gap-3">
        <Link href={ROUTES.locations}>
          <div className="rounded-[18px] p-4 h-full" style={{ background: "linear-gradient(135deg,#1d4ed8,#2563eb)" }}>
            <p className="text-xs font-medium text-blue-200">Ablageorte</p>
            <p className="mt-1.5 text-4xl font-bold leading-none text-white">{locationCount}</p>
          </div>
        </Link>
        <Link href={ROUTES.items}>
          <div className="rounded-[18px] p-4 h-full border border-slate-700" style={{ backgroundColor: "#1a2535" }}>
            <p className="text-xs font-medium text-slate-400">Gegenstände</p>
            <p className="mt-1.5 text-4xl font-bold leading-none text-slate-50">{itemCount}</p>
          </div>
        </Link>
      </div>

      {/* ── Schnellaktionen ── */}
      <div className="grid grid-cols-3 gap-2.5">
        <button
          type="button"
          onClick={openScanner}
          className="flex flex-col items-center justify-center gap-1.5 min-h-[76px] rounded-2xl border border-amber-700/60 bg-amber-950/40 text-amber-400 text-xs font-semibold hover:bg-amber-950/70 transition-colors"
        >
          <LucideIcons.ScanLine className="h-5 w-5" />
          Scannen
        </button>
        <Link
          href={groupId ? `${ROUTES.itemNew}?group=${groupId}` : ROUTES.itemNew}
          className="flex flex-col items-center justify-center gap-1.5 min-h-[76px] rounded-2xl border border-slate-700 text-slate-200 text-xs font-semibold hover:border-brand-500/50 hover:bg-slate-800/50 transition-colors"
          style={{ backgroundColor: "#1a2535" }}
        >
          <LucideIcons.Plus className="h-5 w-5" />
          Gegenstand
        </Link>
        <Link
          href={groupId ? `${ROUTES.locationNew}?group=${groupId}` : ROUTES.locationNew}
          className="flex flex-col items-center justify-center gap-1.5 min-h-[76px] rounded-2xl border border-slate-700 text-slate-200 text-xs font-semibold hover:border-brand-500/50 hover:bg-slate-800/50 transition-colors"
          style={{ backgroundColor: "#1a2535" }}
        >
          <LucideIcons.MapPin className="h-5 w-5" />
          Ablageort
        </Link>
      </div>

      {/* ── Bald ablaufend (Streifen, aufklappbar) ── */}
      {expiringItems.length > 0 && nextExpiry && (
        <details className="group rounded-2xl border border-orange-800/60 bg-orange-950/30 overflow-hidden">
          <summary className="flex items-center gap-3 px-3.5 py-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <div className="h-9 w-9 rounded-[10px] bg-orange-900/50 flex items-center justify-center flex-shrink-0">
              <LucideIcons.Clock className="h-[18px] w-[18px] text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-orange-200">
                {expiringItems.length === 1 ? "1 Gegenstand läuft bald ab" : `${expiringItems.length} laufen bald ab`}
              </p>
              <p className="text-xs text-orange-300/80 truncate">
                Nächster: {nextExpiry.name}, {daysLeft(nextExpiry.expires_at) < 0 ? "abgelaufen" : daysLeft(nextExpiry.expires_at) === 0 ? "heute" : `in ${daysLeft(nextExpiry.expires_at)} Tagen`}
              </p>
            </div>
            <LucideIcons.ChevronDown className="h-4 w-4 text-orange-300 transition-transform group-open:rotate-180" />
          </summary>
          <div className="divide-y divide-orange-900/40 border-t border-orange-900/40">
            {expiringItems.map((item) => {
              const d = daysLeft(item.expires_at);
              const expired = d < 0;
              const dateStr = new Date(item.expires_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
              return (
                <Link key={item.id} href={ROUTES.itemDetail(item.id)} className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-orange-900/20 transition-colors">
                  {expired
                    ? <LucideIcons.AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
                    : <LucideIcons.Clock className="h-4 w-4 text-orange-400 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{item.name}</p>
                    <p className={`text-xs ${expired ? "text-red-400" : "text-orange-300/80"}`}>
                      {expired ? "Abgelaufen" : d === 0 ? "Läuft heute ab" : `In ${d} Tag${d !== 1 ? "en" : ""}`} · {dateStr}
                    </p>
                  </div>
                  <LucideIcons.ChevronRight className="h-4 w-4 text-slate-600 flex-shrink-0" />
                </Link>
              );
            })}
          </div>
        </details>
      )}

      {/* ── Ablageorte ── */}
      <section>
        <div className="flex items-baseline justify-between mb-2.5">
          <h2 className="text-base font-bold text-slate-50">Ablageorte</h2>
          <Link href={ROUTES.locations} className="text-[13px] text-brand-400 hover:text-brand-300 transition-colors">Alle</Link>
        </div>
        {locations.length === 0 ? (
          <p className="rounded-2xl border border-slate-700 px-4 py-8 text-sm text-slate-500 text-center" style={{ backgroundColor: "#1a2535" }}>
            Noch keine Ablageorte
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {locations.map((loc) => {
              const color = loc.color ?? "#3b82f6";
              const n = itemCounts[loc.id];
              return (
                <Link key={loc.id} href={ROUTES.locationDetail(loc.id)}>
                  <div
                    className="relative h-24 overflow-hidden rounded-2xl p-3.5 flex flex-col justify-end"
                    style={{ background: `linear-gradient(160deg, ${color}, ${color}99)` }}
                  >
                    {loc.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={loc.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    {!loc.image_url && (
                      <div className="absolute right-3 top-3 text-white/90"><DynIcon name={loc.icon} className="h-5 w-5" /></div>
                    )}
                    <div className="relative min-w-0">
                      <p className="text-[15px] font-semibold text-white truncate">{loc.name}</p>
                      {n !== undefined && <p className="text-xs text-white/80">{n} {n === 1 ? "Gegenstand" : "Gegenstände"}</p>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Zuletzt hinzugefügt ── */}
      <section>
        <div className="flex items-baseline justify-between mb-2.5">
          <h2 className="text-base font-bold text-slate-50">Zuletzt hinzugefügt</h2>
          <Link href={ROUTES.items} className="text-[13px] text-brand-400 hover:text-brand-300 transition-colors">Alle</Link>
        </div>
        {recentItems.length === 0 ? (
          <p className="rounded-2xl border border-slate-700 px-4 py-8 text-sm text-slate-500 text-center" style={{ backgroundColor: "#1a2535" }}>
            Noch keine Gegenstände
          </p>
        ) : (
          <ul className="space-y-2">
            {recentItems.map((item) => {
              const locColor = item.locations?.color ?? "#6b7280";
              return (
                <li key={item.id}>
                  <Link
                    href={ROUTES.itemDetail(item.id)}
                    className="flex items-center gap-3 rounded-[14px] border border-slate-700 px-3 py-2.5 hover:border-slate-600 transition-colors"
                    style={{ backgroundColor: "#1a2535" }}
                  >
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                      style={{ backgroundColor: locColor + "30" }}
                    >
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span style={{ color: locColor }}><DynIcon name={item.icon} className="h-4 w-4" /></span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-100 truncate">{item.name}</p>
                      {item.locations && <p className="text-xs text-slate-400 truncate">{item.locations.name}</p>}
                    </div>
                    <span className="text-xs text-slate-500 flex-shrink-0">{formatRelativeDate(item.updated_at)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
