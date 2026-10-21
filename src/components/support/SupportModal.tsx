"use client";

import { useState, useEffect } from "react";
import { X, LifeBuoy, Send, Check, Loader2, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

const SUPPORT_EMAIL = "madetofind@web.de";
const MAX_LENGTH    = 2000;
const MIN_LENGTH    = 10;

const CATEGORIES = [
  { id: "question", label: "Frage" },
  { id: "bug",      label: "Fehler melden" },
  { id: "idea",     label: "Idee" },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

interface SupportModalProps {
  isOpen:    boolean;
  onClose:   () => void;
  userEmail: string;
}

export function SupportModal({ isOpen, onClose, userEmail }: SupportModalProps) {
  const [category, setCategory] = useState<CategoryId>("question");
  const [message,  setMessage]  = useState("");
  const [website,  setWebsite]  = useState(""); // Honeypot – bleibt leer
  const [sending,  setSending]  = useState(false);
  const [sent,     setSent]     = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [copied,   setCopied]   = useState(false);

  // Beim Öffnen zurücksetzen
  useEffect(() => {
    if (!isOpen) return;
    setCategory("question");
    setMessage("");
    setWebsite("");
    setSending(false);
    setSent(false);
    setError(null);
    setCopied(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const tooShort = message.trim().length < MIN_LENGTH;

  async function handleSend() {
    if (tooShort || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/support", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ category, message: message.trim(), website }),
      });
      if (res.ok) {
        setSent(true);
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(
        res.status === 429
          ? "Du hast gerade mehrere Nachrichten gesendet. Bitte versuche es in ein paar Minuten noch einmal."
          : (data?.error as string) ?? "Das Senden hat leider nicht geklappt. Bitte versuche es später noch einmal."
      );
    } catch {
      setError("Keine Verbindung. Bitte prüfe deine Internetverbindung und versuche es noch einmal.");
    } finally {
      setSending(false);
    }
  }

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* Kopieren nicht möglich – Adresse bleibt sichtbar */ }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full max-w-sm max-h-[94vh] overflow-y-auto rounded-2xl shadow-2xl"
        style={{ backgroundColor: "#1a2535", border: "1px solid #2d3f55" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid #2d3f55" }}>
          <LifeBuoy className="h-5 w-5 text-brand-400" />
          <h2 className="text-sm font-semibold text-slate-100 flex-1">Support kontaktieren</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors" aria-label="Schließen">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          {sent ? (
            <div className="flex flex-col items-center text-center gap-4 py-4">
              <div
                className="h-16 w-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.35)" }}
              >
                <Check className="h-8 w-8" style={{ color: "#34d399" }} strokeWidth={3} />
              </div>
              <div>
                <p className="text-lg font-bold text-white">Danke für deine Nachricht!</p>
                <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                  Wir melden uns so bald wie möglich per E-Mail bei dir
                  {userEmail ? <> unter <span className="text-slate-300">{userEmail}</span></> : null}.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full h-11 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-colors"
              >
                Schließen
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-400 leading-relaxed">
                Wir helfen dir gern. Beschreibe kurz, worum es geht.
              </p>

              {/* Kategorie */}
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors",
                      category === c.id
                        ? "bg-brand-600 border-brand-500 text-white"
                        : "border-slate-600 text-slate-300 hover:bg-slate-700/50"
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Nachricht */}
              <div className="flex flex-col gap-1.5">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, MAX_LENGTH))}
                  rows={6}
                  placeholder={
                    category === "bug"
                      ? "Was ist passiert? Auf welcher Seite? Was hast du erwartet?"
                      : category === "idea"
                        ? "Welche Idee oder welchen Wunsch hast du?"
                        : "Wie können wir dir helfen?"
                  }
                  className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Antwort an: {userEmail || "deine Konto-Adresse"}</span>
                  <span>{message.length}/{MAX_LENGTH}</span>
                </div>
              </div>

              {/* Honeypot (für Menschen unsichtbar) */}
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="hidden"
                aria-hidden="true"
              />

              {error && (
                <div
                  className="px-3 py-2 rounded-xl text-xs text-red-300"
                  style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}
                >
                  {error}
                </div>
              )}

              <button
                onClick={handleSend}
                disabled={tooShort || sending}
                className="w-full h-11 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {sending
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Wird gesendet…</>
                  : <><Send className="h-4 w-4" /> Nachricht senden</>}
              </button>

              {/* Alternative */}
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500 pt-1">
                <span>Lieber selbst schreiben? {SUPPORT_EMAIL}</span>
                <button
                  type="button"
                  onClick={copyAddress}
                  className="inline-flex items-center gap-1 text-brand-400 hover:text-brand-300 transition-colors"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Kopiert" : "Kopieren"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
