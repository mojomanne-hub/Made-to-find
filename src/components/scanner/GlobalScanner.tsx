"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useGroup } from "@/lib/context/GroupContext";
import { BarcodeScanner } from "./BarcodeScanner";
import { OPEN_SCANNER_EVENT } from "./scanner-events";

interface Match { id: string; name: string; barcode?: string | null; locations: { name: string } | null }

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

  // „Zu vorhandenem Gegenstand hinzufügen“
  const [assigning, setAssigning] = useState(false);
  const [allItems, setAllItems]   = useState<Match[]>([]);
  const [filter, setFilter]       = useState("");

  function scopeQuery<T extends { eq: (c: string, v: string) => T; is: (c: string, v: null) => T }>(q: T, userId: string): T {
    return groupId ? q.eq("group_id", groupId) : q.eq("user_id", userId).is("group_id", null);
  }

  async function handleDetected(scanned: string) {
    setScanning(false);
    setCode(scanned);
    setMatches([]);
    setAssigning(false);
    setError(null);
    setBusy(true);
    try {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push(ROUTES.login); return; }

      const base = supabase
        .from("items")
        .select("id, name, barcode, locations(name)")
        .is("deleted_at", null)
        .in("barcode", codeVariants(scanned));
      const { data, error: err } = await scopeQuery(base, user.id);
      if (err) throw err;

      const found = (data ?? []) as unknown as Match[];
      if (found.length === 1) { router.push(ROUTES.itemDetail(found[0].id)); setCode(null); return; }
      setMatches(found);
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

  function close() { setCode(null); setAssigning(false); setMatches([]); setError(null); }

  const filtered = allItems.filter((i) => i.name.toLowerCase().includes(filter.trim().toLowerCase()));

  return (
    <>
      {scanning && <BarcodeScanner onDetected={handleDetected} onClose={() => setScanning(false)} />}

      <Modal
        isOpen={code !== null && !scanning}
        onClose={close}
        title={assigning ? "Code einem Gegenstand zuordnen" : matches.length > 1 ? "Mehrere Treffer" : "Code gescannt"}
      >
        {code && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Code: <span className="font-mono text-slate-300 break-all">{code}</span>
            </p>

            {error && <p className="text-sm text-red-400">{error}</p>}
            {busy && <p className="text-sm text-slate-400">Einen Moment …</p>}

            {/* Mehrere Gegenstände mit demselben Code */}
            {!busy && !assigning && matches.length > 1 && (
              <ul className="space-y-2 max-h-72 overflow-y-auto">
                {matches.map((m) => (
                  <li key={m.id}>
                    <button
                      onClick={() => { router.push(ROUTES.itemDetail(m.id)); close(); }}
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
            {!busy && !assigning && matches.length === 0 && !error && (
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

            {(error || matches.length > 1 || assigning) && (
              <Button variant="secondary" onClick={close}>Schließen</Button>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
