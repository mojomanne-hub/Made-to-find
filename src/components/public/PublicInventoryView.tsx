"use client";

/**
 * Gäste-Ansicht: Suche + aufklappbare Ablageorte.
 * Icons/Fotos werden schon auf dem Server gerendert und hier nur angezeigt.
 */

import { useMemo, useState, type ReactNode } from "react";
import { Search, ChevronDown, Rows3, X, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";

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

export function PublicInventoryView({ locations, token }: { locations: PublicLocationView[]; token: string }) {
  const [reportItem, setReportItem] = useState<{ id: string; name: string } | null>(null);
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
                          <button
                            onClick={() => setReportItem({ id: item.id, name: item.name })}
                            title="Problem melden"
                            aria-label={`Problem mit ${item.name} melden`}
                            className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 text-slate-500 hover:text-amber-400 hover:bg-amber-900/20 transition-colors"
                          >
                            <AlertTriangle className="h-4 w-4" />
                          </button>
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

      {reportItem && (
        <ReportSheet token={token} item={reportItem} onClose={() => setReportItem(null)} />
      )}
    </div>
  );
}

// ---------- Melden-Fenster ----------

const KIND_OPTIONS = [
  { value: "defekt",    label: "Defekt" },
  { value: "fehlt",     label: "Fehlt" },
  { value: "sonstiges", label: "Sonstiges" },
] as const;

function ReportSheet({ token, item, onClose }: {
  token: string; item: { id: string; name: string }; onClose: () => void;
}) {
  const [kind,    setKind]    = useState<(typeof KIND_OPTIONS)[number]["value"]>("defekt");
  const [message, setMessage] = useState("");
  const [name,    setName]    = useState("");
  const [website, setWebsite] = useState("");   // Honeypot, bleibt für echte Nutzer leer
  const [sending, setSending] = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function send() {
    setSending(true); setError(null);
    try {
      const res = await fetch("/api/public/report", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, item_id: item.id, kind, message, name, website }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Senden fehlgeschlagen.");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Senden fehlgeschlagen.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 pb-8 sm:pb-5 space-y-4"
        style={{ backgroundColor: "#1a2535", border: "1px solid #2d3f55" }}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-slate-100">Problem melden</h2>
            <p className="text-xs text-slate-400 truncate">{item.name}</p>
          </div>
          <button onClick={onClose} aria-label="Schließen" className="text-slate-500 hover:text-slate-300">
            <X className="h-4 w-4" />
          </button>
        </div>

        {done ? (
          <div className="text-center py-4 space-y-2">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
            <p className="text-sm font-medium text-slate-100">Danke für deinen Hinweis!</p>
            <p className="text-xs text-slate-400">Dein Gastgeber wurde benachrichtigt.</p>
            <button onClick={onClose}
              className="mt-2 h-10 px-6 rounded-xl bg-slate-700 hover:bg-slate-600 text-sm text-slate-100 transition-colors">
              Schließen
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              {KIND_OPTIONS.map((o) => (
                <button key={o.value} onClick={() => setKind(o.value)}
                  className={`h-10 rounded-xl text-sm font-medium border transition-colors ${
                    kind === o.value
                      ? "border-amber-500 bg-amber-900/30 text-amber-300"
                      : "border-slate-700 text-slate-400 hover:bg-slate-700/40"}`}>
                  {o.label}
                </button>
              ))}
            </div>

            <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} rows={3}
              placeholder="Was ist passiert? (optional)"
              className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500" />

            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60}
              placeholder="Dein Name (optional)"
              className="w-full h-10 rounded-xl border border-slate-600 bg-slate-800 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500" />

            {/* Honeypot – für Menschen unsichtbar */}
            <input value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off"
              aria-hidden="true" className="hidden" />

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button onClick={send} disabled={sending}
              className="w-full h-11 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Meldung an Gastgeber senden
            </button>
          </>
        )}
      </div>
    </div>
  );
}
