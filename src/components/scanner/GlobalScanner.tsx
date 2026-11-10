"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Pencil, Plus, Minus, MapPin, Eye, Trash2 } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useGroup } from "@/lib/context/GroupContext";
import { BarcodeScanner } from "./BarcodeScanner";
import { OPEN_SCANNER_EVENT } from "./scanner-events";
import { removeStorageImage } from "@/lib/utils/storage";

interface Match { id: string; name: string; barcode?: string | null; locations: { name: string } | null }
interface FullItem extends Match {
  quantity: number | null; description: string | null; shelf_id: string | null;
  icon: string | null; image_url: string | null; color: string | null; expires_at: string | null;
  location_id: string; user_id: string; group_id: string | null;
}
interface Loc { id: string; name: string }
/** Gespeicherte Vorlage (Archiv): bleibt erhalten, auch wenn der Gegenstand gelöscht wurde */
interface Tpl {
  id: string; barcode: string; name: string; description: string | null;
  icon: string | null; color: string | null; image_url: string | null;
}

/** UPC-A (12) und EAN-13 mit führender 0 sind derselbe Code – beide Schreibweisen suchen */
function codeVariants(code: string): string[] {
  const v = new Set([code]);
  if (/^\d{12}$/.test(code)) v.add("0" + code);
  if (/^0\d{12}$/.test(code)) v.add(code.slice(1));
  return [...v];
}

/**
 * Globaler Scanner: einmal im App-Layout eingebunden, wird über openScanner() geöffnet
 * (Button auf der Gegenstände-Seite, Menü, untere Leiste).
 */
export function GlobalScanner() {
  const router = useRouter();
  const { activeGroup } = useGroup();
  const groupId = activeGroup?.id ?? null;
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const open = () => setScanning(true);
    window.addEventListener(OPEN_SCANNER_EVENT, open);
    return () => window.removeEventListener(OPEN_SCANNER_EVENT, open);
  }, []);

  const [code, setCode]         = useState<string | null>(null);
  const [matches, setMatches]   = useState<Match[]>([]);
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Aktionen für einen bekannten Gegenstand
  const [selected, setSelected]   = useState<FullItem | null>(null);
  const [mode, setMode]           = useState<"actions" | "qty" | "location" | "delete">("actions");
  const [addQty, setAddQty]       = useState("1");   // als Text, damit das Feld auch leer sein darf
  const [qtyDir, setQtyDir]       = useState<1 | -1>(1);
  const [locs, setLocs]           = useState<Loc[]>([]);
  const [info, setInfo]           = useState<string | null>(null);
  const [template, setTemplate]   = useState<Tpl | null>(null);

  // „Zu vorhandenem Gegenstand hinzufügen“
  const [assigning, setAssigning] = useState(false);
  const [allItems, setAllItems]   = useState<Match[]>([]);
  const [filter, setFilter]       = useState("");

  function scopeQuery<T extends { eq: (c: string, v: string) => T; is: (c: string, v: null) => T }>(q: T, userId: string): T {
    return groupId ? q.eq("group_id", groupId) : q.eq("user_id", userId).is("group_id", null);
  }

  function openActions(it: FullItem) {
    setSelected(it); setMode("actions"); setAddQty("1"); setInfo(null); setError(null);
  }

  // Eingabe → gültige Zahl (mind. 1; beim Reduzieren höchstens Menge − 1)
  const maxReduce = Math.max(1, (selected?.quantity ?? 1) - 1);
  const parsedQty = Math.max(1, parseInt(addQty || "1", 10) || 1);
  const qtyValue  = qtyDir === -1 ? Math.min(parsedQty, maxReduce) : parsedQty;
  function stepQty(d: 1 | -1) {
    const v = Math.max(1, qtyValue + d);
    setAddQty(String(qtyDir === -1 ? Math.min(v, maxReduce) : v));
  }

  /** Gegenstand löschen (Foto mit entfernen) – der Archiv-Eintrag zum Code bleibt erhalten */
  async function deleteSelected() {
    if (!selected) return;
    setBusy(true); setError(null);
    try {
      const supabase = createBrowserClient();
      const { error: err } = await supabase.from("items").delete().eq("id", selected.id);
      if (err) throw err;
      await removeStorageImage(supabase, "item-images", selected.image_url);
      router.refresh();
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
      setBusy(false);
    }
  }

  async function saveQty() {
    if (!selected) return;
    setBusy(true); setError(null);
    try {
      const supabase = createBrowserClient();
      const current = selected.quantity ?? 1;
      // Reduzieren: nie unter 1 (zum Entfernen den Artikel löschen)
      const next = Math.max(1, current + qtyDir * qtyValue);
      const { error: err } = await supabase.from("items").update({ quantity: next }).eq("id", selected.id);
      if (err) throw err;
      setSelected({ ...selected, quantity: next });
      setInfo(`Menge ist jetzt ${next}.`);
      setMode("actions");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally { setBusy(false); }
  }

  async function startLocation() {
    setMode("location"); setFilter(""); setBusy(true); setError(null);
    try {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const base = supabase.from("locations").select("id, name").is("deleted_at", null).order("name");
      const { data, error: err } = await scopeQuery(base, user.id);
      if (err) throw err;
      setLocs((data ?? []) as Loc[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally { setBusy(false); }
  }

  /** Legt eine Kopie des Gegenstands (gleicher Code, Infos, Foto) in einem anderen Ablageort an */
  async function copyTo(loc: Loc) {
    const src = selected ?? template;
    if (!src) return;
    setBusy(true); setError(null);
    try {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push(ROUTES.login); return; }
      const { data: created, error: err } = await supabase
        .from("items")
        .insert({
          name: src.name, description: src.description, quantity: 1,
          barcode: src.barcode ?? code, location_id: loc.id, shelf_id: null,
          icon: src.icon, image_url: null, color: src.color,
          expires_at: selected ? selected.expires_at : null,
          user_id: user.id, ...(groupId ? { group_id: groupId } : {}),
        })
        .select("id").single();
      if (err) throw err;

      // Foto als eigene Datei kopieren, damit Bearbeiten/Löschen des einen den anderen nicht betrifft
      if (src.image_url) {
        try {
          const blob = await (await fetch(src.image_url)).blob();
          const path = `${user.id}/${created.id}.jpg`;
          const up = await supabase.storage.from("item-images").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
          if (!up.error) {
            const { data: pub } = supabase.storage.from("item-images").getPublicUrl(path);
            await supabase.from("items").update({ image_url: `${pub.publicUrl}?t=${Date.now()}` }).eq("id", created.id);
          }
        } catch { /* Foto optional */ }
      }
      router.push(ROUTES.itemDetail(created.id));
      router.refresh();
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
      setBusy(false);
    }
  }

  async function handleDetected(scanned: string) {
    setScanning(false);
    setCode(scanned);
    setMatches([]);
    setTemplate(null);
    setSelected(null);
    setAssigning(false);
    setError(null);
    setBusy(true);
    try {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push(ROUTES.login); return; }

      const base = supabase
        .from("items")
        .select("*, locations(name)")
        .is("deleted_at", null)
        .in("barcode", codeVariants(scanned));
      const { data, error: err } = await scopeQuery(base, user.id);
      if (err) throw err;

      const found = (data ?? []) as unknown as FullItem[];
      if (found.length === 1) { openActions(found[0]); return; }
      setMatches(found);
      if (found.length === 0) {
        const tq = supabase.from("barcode_templates").select("*").in("barcode", codeVariants(scanned)).limit(1);
        const { data: tpl } = await scopeQuery(tq, user.id);
        const t = (tpl ?? [])[0] as Tpl | undefined;
        if (t) { setTemplate(t); setMode("actions"); setInfo(null); }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function startAssign() {
    setAssigning(true);
    setFilter("");
    setBusy(true);
    try {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const base = supabase
        .from("items")
        .select("id, name, barcode, locations(name)")
        .is("deleted_at", null)
        .order("name")
        .limit(1000);
      const { data, error: err } = await scopeQuery(base, user.id);
      if (err) throw err;
      setAllItems((data ?? []) as unknown as Match[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function assignTo(itemId: string) {
    if (!code) return;
    setBusy(true);
    try {
      const supabase = createBrowserClient();
      const { error: err } = await supabase.from("items").update({ barcode: code }).eq("id", itemId);
      if (err) throw err;
      router.push(ROUTES.itemDetail(itemId));
      setCode(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
      setBusy(false);
    }
  }

  function close() { setCode(null); setAssigning(false); setMatches([]); setError(null); setSelected(null); setTemplate(null); setMode("actions"); setInfo(null); setBusy(false); }

  const filtered = allItems.filter((i) => i.name.toLowerCase().includes(filter.trim().toLowerCase()));

  return (
    <>
      {scanning && <BarcodeScanner onDetected={handleDetected} onClose={() => setScanning(false)} />}

      <Modal
        isOpen={code !== null && !scanning}
        onClose={close}
        title={selected ? selected.name : template ? "Gespeicherter Gegenstand" : assigning ? "Code einem Gegenstand zuordnen" : matches.length > 1 ? "Mehrere Treffer" : "Code gescannt"}
      >
        {code && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Code: <span className="font-mono text-slate-300 break-all">{code}</span>
            </p>

            {error && <p className="text-sm text-red-400">{error}</p>}
            {busy && <p className="text-sm text-slate-400">Einen Moment …</p>}

            {/* Mehrere Gegenstände mit demselben Code */}
            {!busy && !assigning && !selected && matches.length > 1 && (
              <ul className="space-y-2 max-h-72 overflow-y-auto">
                {matches.map((m) => (
                  <li key={m.id}>
                    <button
                      onClick={() => openActions(m as FullItem)}
                      className="w-full text-left rounded-xl border border-slate-600 px-3 py-2.5 hover:border-slate-400 hover:bg-slate-700"
                    >
                      <span className="block text-sm text-slate-100">{m.name}</span>
                      {m.locations && <span className="block text-xs text-slate-500">{m.locations.name}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Unbekannter Code */}
            {!busy && !assigning && !selected && !template && matches.length === 0 && !error && (
              <>
                <p className="text-sm text-slate-300">
                  Zu diesem Code gibt es noch keinen Gegenstand. Du kannst ihn jetzt hinterlegen.
                </p>
                <div className="flex flex-col gap-2">
                  <Button onClick={() => { router.push(`${ROUTES.itemNew}?barcode=${encodeURIComponent(code)}`); close(); }}>
                    Neuen Gegenstand anlegen
                  </Button>
                  <Button variant="secondary" onClick={startAssign}>
                    Zu vorhandenem Gegenstand hinzufügen
                  </Button>
                </div>
              </>
            )}

            {/* Vorhandenen Gegenstand auswählen */}
            {assigning && (
              <>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Gegenstand suchen …"
                    className="input-base pl-10"
                    autoFocus
                  />
                </div>
                <ul className="space-y-2 max-h-64 overflow-y-auto">
                  {filtered.slice(0, 100).map((i) => (
                    <li key={i.id}>
                      <button
                        onClick={() => assignTo(i.id)}
                        disabled={busy}
                        className="w-full text-left rounded-xl border border-slate-600 px-3 py-2.5 hover:border-slate-400 hover:bg-slate-700 disabled:opacity-50"
                      >
                        <span className="block text-sm text-slate-100">{i.name}</span>
                        <span className="block text-xs text-slate-500">
                          {i.locations?.name ?? "—"}
                          {i.barcode ? " · hat schon einen Code (wird ersetzt)" : ""}
                        </span>
                      </button>
                    </li>
                  ))}
                  {!busy && filtered.length === 0 && <li className="text-sm text-slate-500">Kein Gegenstand gefunden.</li>}
                </ul>
              </>
            )}

            {/* Gespeicherte Vorlage (Gegenstand wurde gelöscht, Daten sind noch im Archiv) */}
            {template && !selected && (
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-xl border border-slate-600 p-3">
                  {template.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={template.image_url} alt="" className="h-14 w-14 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-100 truncate">{template.name}</p>
                    <p className="text-xs text-slate-500">Aus dem Archiv – aktuell nirgends abgelegt</p>
                    {template.description && <p className="text-xs text-slate-400 line-clamp-2 mt-1">{template.description}</p>}
                  </div>
                </div>
                {mode === "actions" && !busy && (
                  <div className="flex flex-col gap-2">
                    <Button onClick={startLocation}><MapPin className="h-4 w-4" /> Ablegen in …</Button>
                    <Button variant="secondary" onClick={() => { router.push(`${ROUTES.itemNew}?barcode=${encodeURIComponent(template.barcode)}`); close(); }}>
                      <Pencil className="h-4 w-4" /> Bearbeiten und anlegen
                    </Button>
                  </div>
                )}
                {mode === "location" && (
                  <div className="space-y-3">
                    <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Ablageort suchen …" className="input-base" autoFocus />
                    <ul className="space-y-2 max-h-56 overflow-y-auto">
                      {locs.filter((l) => l.name.toLowerCase().includes(filter.trim().toLowerCase())).map((l) => (
                        <li key={l.id}>
                          <button
                            onClick={() => copyTo(l)} disabled={busy}
                            className="w-full text-left rounded-xl border border-slate-600 px-3 py-2.5 text-sm text-slate-100 hover:border-slate-400 hover:bg-slate-700 disabled:opacity-50"
                          >
                            {l.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                    <Button variant="secondary" onClick={() => setMode("actions")}>Zurück</Button>
                  </div>
                )}
              </div>
            )}

            {/* Aktionen für bekannten Gegenstand */}
            {selected && (
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-xl border border-slate-600 p-3">
                  {selected.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selected.image_url} alt="" className="h-14 w-14 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-100 truncate">{selected.name}</p>
                    <p className="text-xs text-slate-500">
                      {selected.locations?.name ?? "—"} · Menge: {selected.quantity ?? 1}
                    </p>
                    {selected.description && <p className="text-xs text-slate-400 line-clamp-2 mt-1">{selected.description}</p>}
                  </div>
                  <button
                    type="button"
                    aria-label="Artikel bearbeiten"
                    onClick={() => { router.push(ROUTES.itemEdit(selected.id)); close(); }}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 flex-shrink-0"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>

                {info && <p className="text-sm text-emerald-400">{info}</p>}

                {mode === "actions" && !busy && (
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Button onClick={() => { setQtyDir(1); setAddQty("1"); setMode("qty"); setInfo(null); }}>
                        <Plus className="h-4 w-4" /> Menge erhöhen
                      </Button>
                      {(selected.quantity ?? 1) <= 1 ? (
                        <Button variant="danger" onClick={() => { setMode("delete"); setInfo(null); }}>
                          <Trash2 className="h-4 w-4" /> Löschen
                        </Button>
                      ) : (
                        <Button variant="secondary" onClick={() => { setQtyDir(-1); setAddQty("1"); setMode("qty"); setInfo(null); }}>
                          <Minus className="h-4 w-4" /> Menge reduzieren
                        </Button>
                      )}
                    </div>
                    <Button variant="secondary" onClick={startLocation}><MapPin className="h-4 w-4" /> In anderem Ablageort speichern</Button>
                    <Button variant="secondary" onClick={() => { router.push(ROUTES.itemDetail(selected.id)); close(); }}><Eye className="h-4 w-4" /> Artikel ansehen</Button>
                    <Button variant="secondary" onClick={() => { router.push(ROUTES.itemEdit(selected.id)); close(); }}><Pencil className="h-4 w-4" /> Artikel bearbeiten</Button>
                  </div>
                )}

                {mode === "qty" && (
                  <div className="space-y-3">
                    <label className="text-sm text-slate-300 block">{qtyDir === 1 ? "Wie viele kommen dazu?" : "Wie viele gehen weg?"}</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button" aria-label="Weniger" onClick={() => stepQty(-1)} disabled={qtyValue <= 1}
                        className="h-11 w-11 flex-shrink-0 rounded-xl border border-slate-600 text-slate-200 flex items-center justify-center hover:bg-slate-700 disabled:opacity-40"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        type="text" inputMode="numeric" pattern="[0-9]*" value={addQty} autoFocus
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setAddQty(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        onBlur={() => setAddQty(String(qtyValue))}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowUp")   { e.preventDefault(); stepQty(1); }
                          if (e.key === "ArrowDown") { e.preventDefault(); stepQty(-1); }
                          if (e.key === "Enter")     { e.preventDefault(); saveQty(); }
                        }}
                        aria-label="Anzahl"
                        className="input-base text-center"
                      />
                      <button
                        type="button" aria-label="Mehr" onClick={() => stepQty(1)} disabled={qtyDir === -1 && qtyValue >= maxReduce}
                        className="h-11 w-11 flex-shrink-0 rounded-xl border border-slate-600 text-slate-200 flex items-center justify-center hover:bg-slate-700 disabled:opacity-40"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">
                      Neue Menge: {Math.max(1, (selected.quantity ?? 1) + qtyDir * qtyValue)}
                    </p>
                    <div className="flex gap-2">
                      <Button onClick={saveQty} disabled={busy}>Speichern</Button>
                      <Button variant="secondary" onClick={() => setMode("actions")}>Zurück</Button>
                    </div>
                  </div>
                )}

                {mode === "delete" && (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-300">
                      „{selected.name}“ wirklich aus {selected.locations?.name ?? "dem Ablageort"} löschen? Die Daten zum Code bleiben im Archiv.
                    </p>
                    <div className="flex gap-2">
                      <Button variant="danger" onClick={deleteSelected} disabled={busy}><Trash2 className="h-4 w-4" /> Löschen</Button>
                      <Button variant="secondary" onClick={() => setMode("actions")} disabled={busy}>Zurück</Button>
                    </div>
                  </div>
                )}

                {mode === "location" && (
                  <div className="space-y-3">
                    <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Ablageort suchen …" className="input-base" autoFocus />
                    <ul className="space-y-2 max-h-56 overflow-y-auto">
                      {locs.filter((l) => l.name.toLowerCase().includes(filter.trim().toLowerCase())).map((l) => (
                        <li key={l.id}>
                          <button
                            onClick={() => copyTo(l)} disabled={busy}
                            className="w-full text-left rounded-xl border border-slate-600 px-3 py-2.5 text-sm text-slate-100 hover:border-slate-400 hover:bg-slate-700 disabled:opacity-50"
                          >
                            {l.name}{l.id === selected.location_id ? " (aktueller Ort)" : ""}
                          </button>
                        </li>
                      ))}
                    </ul>
                    <Button variant="secondary" onClick={() => setMode("actions")}>Zurück</Button>
                  </div>
                )}
              </div>
            )}

            {(error || (matches.length > 1 && !selected) || assigning || selected || template) && (
              <Button variant="secondary" onClick={close}>Schließen</Button>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
