"use client";

/**
 * GuestQrSection – Gäste-QR-Code für Ferienwohnungs-Gruppen.
 *
 * Gäste scannen den Code und sehen ohne Konto (nur lesen), wo alles in der Wohnung ist.
 * Nur der Ersteller der Gruppe kann den Code erstellen, drucken und erneuern.
 */

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { QrCode, Copy, Check, Loader2, Printer, Download, RefreshCw, ExternalLink } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { confirmDialog } from "@/lib/utils/confirm-dialog";
import { cn } from "@/lib/utils";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.madetofind.de";

interface GuestQrSectionProps {
  groupId:   string;
  groupName: string;
  isCreator: boolean;
}

export function guestLink(token: string) {
  return `${APP_URL}/g/${token}`;
}

export function GuestQrSection({ groupId, groupName, isCreator }: GuestQrSectionProps) {
  const [token,     setToken]     = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [busy,      setBusy]      = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [copied,    setCopied]    = useState(false);

  // Bestehenden Link laden (ohne automatisch einen neuen anzulegen)
  useEffect(() => {
    if (!isCreator) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const supabase = createBrowserClient();
      const { data } = await supabase
        .from("group_public_links")
        .select("token")
        .eq("group_id", groupId)
        .maybeSingle();
      if (!cancelled) {
        setToken((data as { token: string } | null)?.token ?? null);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [groupId, isCreator]);

  // QR-Bild erzeugen, sobald ein Token da ist
  useEffect(() => {
    if (!token) { setQrDataUrl(null); return; }
    QRCode.toDataURL(guestLink(token), { width: 600, margin: 1, errorCorrectionLevel: "M" })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [token]);

  async function fetchLink(renew: boolean) {
    setBusy(true); setError(null);
    try {
      const supabase = createBrowserClient();
      const { data, error: rpcErr } = await supabase.rpc("get_or_create_public_link", {
        p_group_id: groupId,
        p_renew:    renew,
      });
      if (rpcErr) throw rpcErr;
      setToken(data as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "QR-Code konnte nicht erstellt werden.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRenew() {
    const ok = await confirmDialog({
      title:        "Neuen QR-Code erzeugen?",
      message:      "Der alte QR-Code und Link funktionieren danach nicht mehr. Ausgedruckte Schilder musst du neu drucken.",
      confirmLabel: "Erneuern",
    });
    if (ok) await fetchLink(true);
  }

  async function handleCopy() {
    if (!token) return;
    await navigator.clipboard.writeText(guestLink(token));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `QR-${groupName.replace(/[^\wäöüÄÖÜß-]+/g, "_")}.png`;
    a.click();
  }

  // ---------- Darstellung ----------

  const header = (
    <p className="text-sm font-medium text-slate-300 flex items-center gap-1.5">
      <QrCode className="h-4 w-4" /> Gäste-QR-Code
    </p>
  );

  if (!isCreator) {
    return (
      <div className="flex flex-col gap-2">
        {header}
        <p className="text-xs text-slate-500">Nur der Ersteller der Gruppe kann den Gäste-QR-Code verwalten.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {header}
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 text-slate-500 animate-spin" /></div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex flex-col gap-2">
        {header}
        <p className="text-xs text-slate-500">
          Gäste scannen den Code und sehen sofort, wo alles in der Unterkunft ist – ohne Anmeldung, nur zum Ansehen.
          Alle Ablageorte und Gegenstände dieser Gruppe sind darüber sichtbar.
        </p>
        {error && <p className="text-xs text-danger-400">{error}</p>}
        <button
          onClick={() => fetchLink(false)}
          disabled={busy}
          className="w-full h-10 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
          Gäste-QR-Code erstellen
        </button>
      </div>
    );
  }

  const link = guestLink(token);

  return (
    <div className="flex flex-col gap-3">
      {header}

      <div className="mx-auto rounded-xl bg-white p-3">
        {qrDataUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={qrDataUrl} alt="Gäste-QR-Code" className="h-44 w-44" />
          : <div className="h-44 w-44 flex items-center justify-center"><Loader2 className="h-5 w-5 text-slate-400 animate-spin" /></div>}
      </div>

      <div className="flex gap-2">
        <input readOnly value={link}
          className="flex-1 h-10 rounded-xl border border-slate-600 bg-slate-900 px-3 text-xs text-slate-400 focus:outline-none truncate" />
        <button onClick={handleCopy} title="Link kopieren"
          className={cn("h-10 w-10 rounded-xl flex items-center justify-center transition-colors flex-shrink-0",
            copied ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600")}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <a href={`/g/${token}/schild`} target="_blank" rel="noopener noreferrer"
          className="h-10 rounded-xl text-sm font-medium flex items-center justify-center gap-2 bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors">
          <Printer className="h-4 w-4" /> Schild drucken
        </a>
        <button onClick={handleDownload} disabled={!qrDataUrl}
          className="h-10 rounded-xl text-sm font-medium flex items-center justify-center gap-2 bg-slate-700 text-slate-200 hover:bg-slate-600 disabled:opacity-50 transition-colors">
          <Download className="h-4 w-4" /> Als Bild
        </button>
        <a href={`/g/${token}`} target="_blank" rel="noopener noreferrer"
          className="h-10 rounded-xl text-sm font-medium flex items-center justify-center gap-2 border border-slate-700 text-slate-300 hover:bg-slate-700/40 transition-colors">
          <ExternalLink className="h-4 w-4" /> Gästeansicht
        </a>
        <button onClick={handleRenew} disabled={busy}
          className="h-10 rounded-xl text-sm font-medium flex items-center justify-center gap-2 border border-slate-700 text-amber-400 hover:bg-amber-900/20 disabled:opacity-50 transition-colors">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Erneuern
        </button>
      </div>

      {error && <p className="text-xs text-danger-400">{error}</p>}

      <p className="text-xs text-slate-500">
        Tipp: Keine privaten Infos (z. B. Schlüsselsafe-Code) in Beschreibungen schreiben – jeder mit dem Code kann alles in dieser Gruppe sehen.
      </p>
    </div>
  );
}
