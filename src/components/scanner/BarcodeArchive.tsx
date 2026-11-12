"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, MapPin, Search, Check, X, ScanLine } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { removeStorageImage } from "@/lib/utils/storage";
import { ROUTES } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { openScanner } from "./scanner-events";

export interface ArchiveEntry {
  id: string; barcode: string; name: string; description: string | null;
  icon: string | null; color: string | null; image_url: string | null; updated_at: string;
}
interface Loc { id: string; name: string }

interface Props {
  entries:   ArchiveEntry[];
  locations: Loc[];
  inUse:     Record<string, number>;   // Code → Anzahl aktuell abgelegter Gegenstände
  userId:    string;
  groupId:   string | null;
}

type Mode = { kind: "edit" | "delete" | "place"; id: string } | null;

/** Liste aller gespeicherten Codes: bearbeiten, löschen, in einen Ablageort legen */
export function BarcodeArchive({ entries, locations, inUse, userId, groupId }: Props) {
  const router = useRouter();
  const [list, setList]     = useState(entries);
  const [filter, setFilter] = useState("");
  const [mode, setMode]     = useState<Mode>(null);
  const [name, setName]     = useState("");
  const [desc, setDesc]     = useState("");
  const [busy, setBusy]     = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return list;
    return list.filter((e) => e.name.toLowerCase().includes(q) || e.barcode.toLowerCase().includes(q));
  }, [list, filter]);

  function startEdit(e: ArchiveEntry) {
    setMode({ kind: "edit", id: e.id }); setName(e.name); setDesc(e.description ?? ""); setError(null);
  }

  async function saveEdit(e: ArchiveEntry) {
    if (!name.trim()) { setError("Bitte einen Namen eingeben."); return; }
    setBusy(true); setError(null);
    try {
      const supabase = createBrowserClient();
      const patch = { name: name.trim().slice(0, 100), description: desc.trim() || null, updated_at: new Date().toISOString() };
      const { error: err } = await supabase.from("barcode_templates").update(patch).eq("id", e.id);
      if (err) throw err;
      setList((prev) => prev.map((x) => (x.id === e.id ? { ...x, ...patch } : x)));
      setMode(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally { setBusy(false); }
  }

  async function remove(e: ArchiveEntry) {
    setBusy(true); setError(null);
    try {
      const supabase = createBrowserClient();
      const { error: err } = await supabase.from("barcode_templates").delete().eq("id", e.id);
      if (err) throw err;
      await removeStorageImage(supabase, "item-images", e.image_url);
      setList((prev) => prev.filter((x) => x.id !== e.id));
      setMode(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally { setBusy(false); }
  }

  /** Legt aus dem Archiv-Eintrag einen Gegenstand im gewählten Ablageort an */
  async function placeIn(e: ArchiveEntry, loc: Loc) {
    setBusy(true); setError(null);
    try {
      const supabase = createBrowserClient();
      const { data: created, error: err } = await supabase
        .from("items")
        .insert({
          name: e.name, description: e.description, quantity: 1, barcode: e.barcode,
          location_id: loc.id, shelf_id: null, icon: e.icon, image_url: null, color: e.color,
          user_id: userId, ...(groupId ? { group_id: groupId } : {}),
        })
        .select("id").single();
      if (err) throw err;

      if (e.image_url) {
        try {
          const blob = await (await fetch(e.image_url)).blob();
          const path = `${userId}/${created.id}.jpg`;
          const up = await supabase.storage.from("item-images").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
          if (!up.error) {
            const { data: pub } = supabase.storage.from("item-images").getPublicUrl(path);
            await supabase.from("items").update({ image_url: `${pub.publicUrl}?t=${Date.now()}` }).eq("id", created.id);
          }
        } catch { /* Foto ist optional */ }
      }
      router.push(ROUTES.itemDetail(created.id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
      setBusy(false);
    }
  }

  if (list.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-700 px-5 py-10 text-center" style={{ backgroundColor: "#1a2535" }}>
        <p className="text-sm text-slate-300">Noch keine Codes im Archiv.</p>
        <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto">
          Sobald du einen Gegenstand mit Barcode speicherst, merkt sich die App die Angaben dazu – auch wenn du den Gegenstand später löschst.
        </p>
        <div className="mt-4 flex justify-center">
          <Button size="sm" onClick={openScanner}><ScanLine className="h-4 w-4" /> Jetzt scannen</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
        <input
          value={filter} onChange={(e) => setFilter(e.target.value)}
          placeholder="Name oder Code suchen …" aria-label="Archiv durchsuchen"
          className="input-base pl-9"
        />
      </div>
      <p className="text-xs text-slate-500">{shown.length} von {list.length} Einträgen</p>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <ul className="space-y-2">
        {shown.map((e) => {
          const active = mode?.id === e.id ? mode.kind : null;
          const n = inUse[e.barcode] ?? 0;
          return (
            <li key={e.id} className="rounded-2xl border border-slate-700 p-3" style={{ backgroundColor: "#1a2535" }}>
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center bg-slate-800 text-slate-500">
                  {e.image_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={e.image_url} alt="" className="h-full w-full object-cover" />
                    : <ScanLine className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-100 truncate">{e.name}</p>
                  <p className="text-xs text-slate-500 font-mono truncate">{e.barcode}</p>
                  {e.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{e.description}</p>}
                  <p className={`text-[11px] mt-1 ${n > 0 ? "text-emerald-400" : "text-slate-500"}`}>
                    {n > 0 ? `Aktuell ${n}× abgelegt` : "Aktuell nirgends abgelegt"}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button type="button" aria-label="In Ablageort ablegen" onClick={() => { setMode({ kind: "place", id: e.id }); setError(null); }}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"><MapPin className="h-4 w-4" /></button>
                  <button type="button" aria-label="Bearbeiten" onClick={() => startEdit(e)}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"><Pencil className="h-4 w-4" /></button>
                  <button type="button" aria-label="Aus dem Archiv löschen" onClick={() => { setMode({ kind: "delete", id: e.id }); setError(null); }}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>

              {active === "edit" && (
                <div className="mt-3 space-y-2 border-t border-slate-700 pt-3">
                  <label className="block text-xs text-slate-400">Name
                    <input value={name} onChange={(ev) => setName(ev.target.value)} maxLength={100} className="input-base mt-1" autoFocus />
                  </label>
                  <label className="block text-xs text-slate-400">Beschreibung
                    <textarea value={desc} onChange={(ev) => setDesc(ev.target.value)} rows={2} maxLength={500} className="input-base mt-1" />
                  </label>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEdit(e)} disabled={busy}><Check className="h-4 w-4" /> Speichern</Button>
                    <Button size="sm" variant="secondary" onClick={() => setMode(null)} disabled={busy}><X className="h-4 w-4" /> Abbrechen</Button>
                  </div>
                  <p className="text-[11px] text-slate-500">Ändert nur den Archiv-Eintrag. Bereits abgelegte Gegenstände bleiben, wie sie sind.</p>
                </div>
              )}

              {active === "delete" && (
                <div className="mt-3 space-y-2 border-t border-slate-700 pt-3">
                  <p className="text-sm text-slate-300">
                    „{e.name}“ aus dem Archiv löschen? Beim nächsten Scan dieses Codes musst du die Angaben neu eingeben.
                    {n > 0 && " Abgelegte Gegenstände mit diesem Code bleiben erhalten."}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="danger" onClick={() => remove(e)} disabled={busy}><Trash2 className="h-4 w-4" /> Löschen</Button>
                    <Button size="sm" variant="secondary" onClick={() => setMode(null)} disabled={busy}>Abbrechen</Button>
                  </div>
                </div>
              )}

              {active === "place" && (
                <div className="mt-3 space-y-2 border-t border-slate-700 pt-3">
                  <p className="text-xs text-slate-400">In welchem Ablageort ablegen?</p>
                  {locations.length === 0 ? (
                    <p className="text-sm text-slate-500">Noch keine Ablageorte vorhanden.</p>
                  ) : (
                    <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                      {locations.map((l) => (
                        <li key={l.id}>
                          <button type="button" onClick={() => placeIn(e, l)} disabled={busy}
                            className="w-full text-left rounded-xl border border-slate-600 px-3 py-2 text-sm text-slate-100 hover:border-slate-400 hover:bg-slate-700 disabled:opacity-50">
                            {l.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => setMode(null)} disabled={busy}>Abbrechen</Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
