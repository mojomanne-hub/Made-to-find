"use client";

/**
 * Gäste-Ansicht: Suche + aufklappbare Ablageorte.
 * Icons/Fotos werden schon auf dem Server gerendert und hier nur angezeigt.
 */

import { useMemo, useState, type ReactNode } from "react";
import { Search, ChevronDown, Rows3, X } from "lucide-react";

export interface PublicItemView {
  id: string; name: string; description: string | null; quantity: number;
  visual: ReactNode;
}
export interface PublicSectionView {
  key: string; title: string | null; items: PublicItemView[];
}
export interface PublicLocationView {
  id: string; name: string; description: string | null; color: string;
  imageUrl: string | null; visual: ReactNode;
  itemCount: number; sections: PublicSectionView[];
}

function norm(s: string | null | undefined) {
  return (s ?? "").toLocaleLowerCase("de-DE");
}

export function PublicInventoryView({ locations }: { locations: PublicLocationView[] }) {
  const [query, setQuery] = useState("");
  const [open,  setOpen]  = useState<Set<string>>(
    () => new Set(locations.length <= 2 ? locations.map((l) => l.id) : []),
  );

  const q = norm(query.trim());

  const filtered = useMemo(() => {
    if (!q) return locations;
    return locations
      .map((loc) => {
        // Ortsname passt → ganzen Ort zeigen
        if (norm(loc.name).includes(q) || norm(loc.description).includes(q)) return loc;
        const sections = loc.sections
          .map((s) => ({
            ...s,
            items: s.items.filter((i) => norm(i.name).includes(q) || norm(i.description).includes(q)),
          }))
          .filter((s) => s.items.length > 0);
        return sections.length ? { ...loc, sections } : null;
      })
      .filter((l): l is PublicLocationView => l !== null);
  }, [locations, q]);

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {/* Suche */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Was suchst du? z. B. Korkenzieher"
          className="w-full h-12 rounded-2xl border border-slate-700 bg-slate-800/80 pl-10 pr-10 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {query && (
          <button onClick={() => setQuery("")} aria-label="Suche löschen"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-8">
          {q ? `Nichts gefunden für „${query.trim()}“.` : "Hier wurde noch nichts eingetragen."}
        </p>
      )}

      {filtered.map((loc) => {
        const isOpen = !!q || open.has(loc.id);
        return (
          <div key={loc.id} className="rounded-2xl border border-slate-700/70 overflow-hidden"
            style={{ backgroundColor: "#1a2535" }}>
            <button onClick={() => toggle(loc.id)} className="w-full flex items-center gap-3 p-3 text-left">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={{ backgroundColor: loc.color + "33", color: loc.color }}>
                {loc.visual}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-100 truncate">{loc.name}</p>
                <p className="text-xs text-slate-500">
                  {loc.itemCount} {loc.itemCount === 1 ? "Gegenstand" : "Gegenstände"}
                </p>
              </div>
              <ChevronDown className={`h-5 w-5 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
              <div className="px-3 pb-3 space-y-3">
                {loc.imageUrl && !q && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={loc.imageUrl} alt={loc.name}
                    className="w-full max-h-64 object-contain rounded-xl" style={{ backgroundColor: loc.color + "22" }} />
                )}
                {loc.description && <p className="text-xs text-slate-400">{loc.description}</p>}

                {loc.sections.length === 0 && (
                  <p className="text-xs text-slate-600">Noch keine Gegenstände eingetragen.</p>
                )}

                {loc.sections.map((section) => (
                  <div key={section.key}>
                    {section.title && (
                      <div className="flex items-center gap-1.5 mb-1.5 mt-1">
                        <Rows3 className="h-3.5 w-3.5 text-slate-500" />
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{section.title}</h3>
                      </div>
                    )}
                    <ul className="space-y-1.5">
                      {section.items.map((item) => (
                        <li key={item.id} className="flex items-center gap-3 rounded-xl bg-slate-800/60 px-2.5 py-2">
                          <div className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {item.visual}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-100 truncate">{item.name}</p>
                            {item.description && <p className="text-xs text-slate-500 line-clamp-2">{item.description}</p>}
                          </div>
                          {item.quantity > 1 && (
                            <span className="text-xs font-medium text-slate-400 flex-shrink-0">{item.quantity}×</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
