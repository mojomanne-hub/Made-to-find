"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function keyToBytes(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

type Status = "loading" | "unsupported" | "denied" | "off" | "on";

/** Einstellungen: Push-Benachrichtigungen für DIESES Gerät ein-/ausschalten */
export function PushToggle() {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy]     = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [info, setInfo]     = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window) || !VAPID_PUBLIC_KEY) {
        setStatus("unsupported"); return;
      }
      if (Notification.permission === "denied") { setStatus("denied"); return; }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setStatus(sub && Notification.permission === "granted" ? "on" : "off");
      } catch { setStatus("off"); }
    })();
  }, []);

  async function enable() {
    setBusy(true); setError(null); setInfo(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setStatus(permission === "denied" ? "denied" : "off"); return; }

      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription())
        ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(VAPID_PUBLIC_KEY) });

      const res = await fetch("/api/push/subscribe", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Anmeldung fehlgeschlagen.");
      }
      const j = await res.json().catch(() => null) as { sent?: number; errors?: string[] } | null;
      setStatus("on");
      if ((j?.sent ?? 0) > 0) {
        setInfo("Testmeldung verschickt. Erscheint sie nicht, blockiert das Gerät die Anzeige – prüfe in den Android-Einstellungen, ob Benachrichtigungen für MaDe to find bzw. Chrome erlaubt sind.");
      } else {
        setError(`Eingeschaltet, aber der Server konnte keine Testmeldung verschicken${j?.errors?.length ? ` (${j.errors.join("; ")})` : ""}.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally { setBusy(false); }
  }

  async function disable() {
    setBusy(true); setError(null); setInfo(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("off");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally { setBusy(false); }
  }

  return (
    <Card>
      <CardHeader><h2 className="text-sm font-semibold text-slate-100">Benachrichtigungen</h2></CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-400">
            Meldungen direkt auf dieses Gerät, auch wenn die App geschlossen ist – zum Beispiel, wenn ein Gegenstand
            heute oder in 7 Tagen abläuft.
          </p>
          {error && <Alert variant="error">{error}</Alert>}
          {info && <p className="text-sm text-emerald-400">{info}</p>}

          {status === "loading" && <p className="text-sm text-slate-500">Wird geprüft …</p>}
          {status === "unsupported" && (
            <p className="text-sm text-slate-500">
              Auf diesem Gerät oder Browser nicht verfügbar. Auf dem iPhone funktioniert es nur, wenn die App über
              „Zum Home-Bildschirm“ installiert ist.
            </p>
          )}
          {status === "denied" && (
            <p className="text-sm text-amber-400">
              Benachrichtigungen sind für diese App in den Geräte- bzw. Browser-Einstellungen blockiert. Erlaube sie dort
              und lade die Seite neu.
            </p>
          )}
          {status === "off" && (
            <div><Button size="sm" onClick={enable} isLoading={busy}><BellRing className="h-4 w-4" /> Einschalten</Button></div>
          )}
          {status === "on" && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-emerald-400">Auf diesem Gerät eingeschaltet</span>
              <Button size="sm" variant="secondary" onClick={enable} isLoading={busy}>Testmeldung</Button>
              <Button size="sm" variant="secondary" onClick={disable} isLoading={busy}>Ausschalten</Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
