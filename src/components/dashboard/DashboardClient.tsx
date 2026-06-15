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

// Dynamisches Icon-Rendering
function DynIcon({ name, className }: { name: string | null; className?: string }) {
  const Icon = name
    ? (LucideIcons as unknown as Record<string, React.FC<{ className?: string }>>)[name]
    : null;
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

interface Props {
  locationCount: number;
  itemCount:     number;
  locations:     Location[];
  recentItems:   RecentItem[];
  groupId:       string | null;
}

export function DashboardClient({ locationCount, itemCount, locations, recentItems, groupId }: Props) {
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

  return (
    <div className="space-y-5">

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

      {/* ── Schnellaktionen ── */}
      <div className="grid grid-cols-2 gap-3">
        <Link href={groupId ? `${ROUTES.locationNew}?group=${groupId}` : ROUTES.locationNew}>
          <div className="flex items-center gap-4 p-4 rounded-2xl border border-slate-700 hover:border-brand-500/50 hover:bg-slate-800/50 transition-all cursor-pointer">
            <div className="h-11 w-11 rounded-xl bg-brand-600 flex items-center justify-center flex-shrink-0">
              <LucideIcons.MapPin className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-100">Neuer Ablageort</p>
              <p className="text-xs text-slate-500 mt-0.5">Erstelle einen neuen Ablageort</p>
            </div>
          </div>
        </Link>
        <Link href={groupId ? `${ROUTES.itemNew}?group=${groupId}` : ROUTES.itemNew}>
          <div className="flex items-center gap-4 p-4 rounded-2xl border border-slate-700 hover:border-brand-500/50 hover:bg-slate-800/50 transition-all cursor-pointer">
            <div className="h-11 w-11 rounded-xl bg-slate-600 flex items-center justify-center flex-shrink-0">
              <LucideIcons.Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-100">Neuer Gegenstand</p>
              <p className="text-xs text-slate-500 mt-0.5">Füge einen neuen Gegenstand hinzu</p>
            </div>
          </div>
        </Link>
      </div>

      {/* ── Statistiken ── */}
      <div className="grid grid-cols-2 gap-3">
        <Link href={ROUTES.locations}>
          <div className="p-4 rounded-2xl border border-slate-700 hover:border-brand-500/50 transition-all" style={{ backgroundColor: "#1a2535" }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Ablageorte</p>
              <div className="h-9 w-9 rounded-xl bg-brand-900/60 flex items-center justify-center">
                <LucideIcons.MapPin className="h-4 w-4 text-brand-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-100">{locationCount}</p>
          </div>
        </Link>
        <Link href={ROUTES.items}>
          <div className="p-4 rounded-2xl border border-slate-700 hover:border-brand-500/50 transition-all" style={{ backgroundColor: "#1a2535" }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Artikel</p>
              <div className="h-9 w-9 rounded-xl bg-slate-700 flex items-center justify-center">
                <LucideIcons.Package className="h-4 w-4 text-slate-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-100">{itemCount}</p>
          </div>
        </Link>
      </div>

      {/* ── Untere Sektion ── */}
      <div className="grid lg:grid-cols-2 gap-4">

        {/* Ablageorte-Übersicht */}
        <div className="rounded-2xl border border-slate-700 overflow-hidden" style={{ backgroundColor: "#1a2535" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <LucideIcons.MapPin className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-200">Deine Ablageorte</h2>
            </div>
            <Link href={ROUTES.locations} className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
              Alle →
            </Link>
          </div>

          {locations.length === 0 ? (
            <p className="px-4 py-8 text-sm text-slate-500 text-center">Noch keine Ablageorte</p>
          ) : (
            <div className="p-3 grid grid-cols-2 gap-2">
              {locations.map((loc) => {
                const color = loc.color ?? "#3b82f6";
                return (
                  <Link key={loc.id} href={ROUTES.locationDetail(loc.id)}>
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-700 hover:border-slate-600 hover:bg-slate-700/30 transition-all">
                      {/* Farb-Icon */}
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                        style={{ backgroundColor: color }}
                      >
                        {loc.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={loc.image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <DynIcon name={loc.icon} className="h-5 w-5 text-white" />
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-200 truncate">{loc.name}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Zuletzt hinzugefügt */}
        <div className="rounded-2xl border border-slate-700 overflow-hidden" style={{ backgroundColor: "#1a2535" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <LucideIcons.Clock className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-200">Zuletzt hinzugefügt</h2>
            </div>
            <Link href={ROUTES.items} className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
              Alle →
            </Link>
          </div>

          {recentItems.length === 0 ? (
            <p className="px-4 py-8 text-sm text-slate-500 text-center">Noch keine Gegenstände</p>
          ) : (
            <ul>
              {recentItems.map((item) => {
                const locColor = item.locations?.color ?? "#6b7280";
                return (
                  <li key={item.id} className="border-b border-slate-700/50 last:border-0">
                    <Link
                      href={ROUTES.itemDetail(item.id)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-700/30 transition-colors"
                    >
                      {/* Icon */}
                      <div
                        className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
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
                        <p className="text-sm font-medium text-slate-200 truncate">{item.name}</p>
                        {item.locations && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <LucideIcons.MapPin className="h-3 w-3 flex-shrink-0" style={{ color: locColor }} />
                            <span className="text-xs text-slate-500 truncate">{item.locations.name}</span>
                          </div>
                        )}
                        <p className="text-xs text-slate-600 mt-0.5">{formatRelativeDate(item.updated_at)}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
