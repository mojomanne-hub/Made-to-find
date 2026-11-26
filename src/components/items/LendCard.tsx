"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HandHelping, Undo2, Pencil, CalendarClock } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

interface Props {
  itemId:     string;
  lentTo:     string | null;
  lentAt:     string | null;
  lentUntil:  string | null;
}

const today = () => new Date().toISOString().slice(0, 10);
const de = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

/** Verleihen: wer hat den Gegenstand, seit wann, bis wann zurück */
export function LendCard({ itemId, lentTo, lentAt, lentUntil }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName]       = useState(lentTo ?? "");
  const [since, setSince]     = useState(lentAt ?? today());
  const [until, setUntil]     = useState(lentUntil ?? "");
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function save(values: { lent_to: string | null; lent_at: string | null; lent_until: string | null }) {
    setBusy(true); setError(null);
    try {
      const supabase = createBrowserClient();
      const { error: err } = await supabase.from("items").update(values).eq("id", itemId);
      if (err) throw err;
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
    } finally { setBusy(false); }
  }

  function submit() {
    if (!name.trim()) { setError("Bitte eintragen, an wen du ihn verliehen hast."); return; }
    if (until && since && until < since) { setError("Das Rückgabedatum liegt vor dem Ausleihdatum."); return; }
    save({ lent_to: name.trim().slice(0, 100), lent_at: since || today(), lent_until: until || null });
  }

  // ── Formular ──
  if (editing) {
    return (
      <div className="rounded-xl p-3 space-y-3" style={{ backgroundColor: "#1a2535", border: "1px solid #2d3f55" }}>
        <p className="text-sm font-semibold text-slate-100">{lentTo ? "Verleih ändern" : "Gegenstand verleihen"}</p>
        <label className="block text-xs text-slate-400">
          An wen?
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoFocus autoComplete="off"
            placeholder="z. B. Nachbar Peter" className="input-base mt-1" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs text-slate-400">
            Verliehen am
            <input type="date" value={since} onChange={(e) => setSince(e.target.value)} className="input-base mt-1" />
          </label>
          <label className="block text-xs text-slate-400">
            Zurück bis (optional)
            <input type="date" value={until} min={since || undefined} onChange={(e) => setUntil(e.target.value)} className="input-base mt-1" />
          </label>
        </div>
        {error && <p className="text-xs text-danger-400">{error}</p>}
        <div className="flex gap-2">
          <Button size="sm" onClick={submit} isLoading={busy}>Speichern</Button>
          <Button size="sm" variant="secondary" onClick={() => { setEditing(false); setError(null); }} disabled={busy}>Abbrechen</Button>
        </div>
      </div>
    );
  }

  // ── Nicht verliehen ──
  if (!lentTo) {
    return (
      <button
        type="button"
        onClick={() => { setName(""); setSince(today()); setUntil(""); setEditing(true); }}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
        style={{ backgroundColor: "#1a2535", border: "1px solid #2d3f55" }}
      >
        <HandHelping className="h-4 w-4 text-slate-400" aria-hidden="true" />
        Verleihen
      </button>
    );
  }

  // ── Verliehen ──
  const overdue = !!lentUntil && lentUntil < today();
  return (
    <div className="rounded-xl p-3 space-y-2"
      style={overdue
        ? { backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.35)" }
        : { backgroundColor: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.35)" }}>
      <div className="flex items-start gap-2">
        <HandHelping className={overdue ? "h-4 w-4 mt-0.5 text-red-400" : "h-4 w-4 mt-0.5 text-amber-400"} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className={overdue ? "text-sm font-semibold text-red-300" : "text-sm font-semibold text-amber-200"}>
            Verliehen an {lentTo}
          </p>
          <p className="text-xs text-slate-400">
            {lentAt ? `seit ${de(lentAt)}` : ""}
            {lentUntil && (
              <span className={overdue ? "text-red-400 font-medium" : ""}>
                {lentAt ? " · " : ""}{overdue ? "sollte zurück sein am " : "zurück bis "}{de(lentUntil)}
              </span>
            )}
          </p>
        </div>
      </div>
      {error && <p className="text-xs text-danger-400">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => save({ lent_to: null, lent_at: null, lent_until: null })} isLoading={busy}>
          <Undo2 className="h-4 w-4" /> Zurückbekommen
        </Button>
        <Button size="sm" variant="secondary" onClick={() => { setName(lentTo); setSince(lentAt ?? today()); setUntil(lentUntil ?? ""); setEditing(true); }} disabled={busy}>
          <Pencil className="h-4 w-4" /> Ändern
        </Button>
      </div>
      {overdue && (
        <p className="flex items-center gap-1 text-[11px] text-red-400/80">
          <CalendarClock className="h-3 w-3" aria-hidden="true" /> Rückgabe überfällig
        </p>
      )}
    </div>
  );
}
