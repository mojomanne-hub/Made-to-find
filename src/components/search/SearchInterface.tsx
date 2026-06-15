"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, MapPin, Package, X } from "lucide-react";
import { createBrowserClient }  from "@/lib/supabase/client";
import { useDebounce }          from "@/lib/hooks";
import { Input }                from "@/components/ui/Input";
import { Card }                 from "@/components/ui/Card";
import { EmptyState, Spinner }  from "@/components/ui/Badge";
import { ROUTES, SEARCH_MIN_LENGTH, SEARCH_DEBOUNCE_MS } from "@/lib/constants";

interface SearchRow {
  kind:          string;
  id:            string;
  name:          string;
  description:   string | null;
  location_id:   string;
  location_name: string;
  quantity:      number | null;
  updated_at:    string;
}

function highlight(text: string, query: string) {
  if (!query) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="bg-brand-100 text-brand-800 rounded px-0.5 not-italic">{part}</mark>
          : part
      )}
    </>
  );
}

export function SearchInterface({ userId, groupId }: { userId: string; groupId: string | null }) {
  const [query,       setQuery]       = useState("");
  const [results,     setResults]     = useState<SearchRow[]>([]);
  const [isLoading,   setIsLoading]   = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    if (debouncedQuery.trim().length < SEARCH_MIN_LENGTH) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    async function search() {
      setIsLoading(true);
      setHasSearched(true);
      try {
        const supabase = createBrowserClient();
        const q = debouncedQuery.trim();

        const [{ data: items }, { data: locations }] = await Promise.all([
          (() => {
            let q2 = supabase.from("items")
              .select("id, name, description, quantity, updated_at, location_id, locations(name)")
              .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
              .is("deleted_at", null).order("name").limit(20);
            if (groupId) q2 = q2.eq("group_id", groupId);
            else q2 = q2.eq("user_id", userId).is("group_id", null);
            return q2;
          })(),
          (() => {
            let q3 = supabase.from("locations")
              .select("id, name, description, updated_at")
              .ilike("name", `%${q}%`)
              .is("deleted_at", null).order("name").limit(10);
            if (groupId) q3 = q3.eq("group_id", groupId);
            else q3 = q3.eq("user_id", userId).is("group_id", null);
            return q3;
          })(),
        ]);

        const itemRows: SearchRow[] = (items ?? []).map((i) => ({
          kind:          "item",
          id:            i.id,
          name:          i.name,
          description:   i.description,
          location_id:   i.location_id,
          location_name: (i.locations as unknown as { name: string } | null)?.name ?? "–",
          quantity:      i.quantity,
          updated_at:    i.updated_at,
        }));

        const locationRows: SearchRow[] = (locations ?? []).map((l) => ({
          kind:          "location",
          id:            l.id,
          name:          l.name,
          description:   l.description,
          location_id:   l.id,
          location_name: l.name,
          quantity:      null,
          updated_at:    l.updated_at,
        }));

        setResults([...itemRows, ...locationRows]);
      } finally {
        setIsLoading(false);
      }
    }

    search();
  }, [debouncedQuery]);

  const items     = results.filter((r) => r.kind === "item");
  const locations = results.filter((r) => r.kind === "location");

  return (
    <div className="max-w-2xl">
      {/* Suchfeld */}
      <div className="relative mb-6">
        <Input
          type="search"
          placeholder="Gegenstand, Beschreibung oder Ablageort suchen…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
          autoFocus
          className="h-12 text-base rounded-2xl pr-10"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-400"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Laden */}
      {isLoading && (
        <div className="flex justify-center py-8"><Spinner /></div>
      )}

      {/* Ergebnisse */}
      {!isLoading && hasSearched && (
        results.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Search />}
              title="Keine Ergebnisse"
              description={`Für „${query}" wurde nichts gefunden.`}
            />
          </Card>
        ) : (
          <div className="space-y-5">
            <p className="text-xs text-slate-400">
              {results.length} Ergebnis{results.length !== 1 ? "se" : ""} für „<strong className="text-slate-300">{query}</strong>"
            </p>

            {items.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Gegenstände ({items.length})
                </p>
                <div className="space-y-2">
                  {items.map((r) => (
                    <Link key={r.id} href={ROUTES.itemDetail(r.id)}>
                      <Card hoverable>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-slate-700 flex items-center justify-center flex-shrink-0">
                            <Package className="h-4 w-4 text-slate-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-100">{highlight(r.name, query)}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3 text-brand-500 flex-shrink-0" />
                              <span className="text-xs text-slate-500">{r.location_name}</span>
                              <span className="text-xs text-neutral-300">· {r.quantity}×</span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {locations.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Ablageorte ({locations.length})
                </p>
                <div className="space-y-2">
                  {locations.map((r) => (
                    <Link key={r.id} href={ROUTES.locationDetail(r.id)}>
                      <Card hoverable>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                            <MapPin className="h-4 w-4 text-brand-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-100">{highlight(r.name, query)}</p>
                            {r.description && <p className="text-xs text-slate-500 truncate mt-0.5">{r.description}</p>}
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* Startzustand */}
      {!hasSearched && !isLoading && (
        <div className="text-center py-14 text-slate-500">
          <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Mindestens 2 Zeichen eingeben</p>
        </div>
      )}
    </div>
  );
}
