"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";

export function DeleteAccountCard() {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const CONFIRM_WORD = "LÖSCHEN";
  const canConfirm = confirmText.trim().toUpperCase() === CONFIRM_WORD;

  async function handleDeleteAccount() {
    if (!canConfirm) return;
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push(ROUTES.login);
        return;
      }

      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Löschen fehlgeschlagen.");
      }

      await supabase.auth.signOut();
      router.push(ROUTES.login);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten.");
      setIsLoading(false);
    }
  }

  return (
    <>
      <Card className="border border-danger-500/30">
        <CardHeader>
          <h2 className="text-sm font-semibold text-danger-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Gefahrenzone
          </h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-400 mb-3">
            Dein Konto sowie alle Ablageorte, Gegenstände und Fotos werden unwiderruflich gelöscht.
            Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowConfirm(true)}
          >
            <Trash2 className="h-4 w-4" /> Account löschen
          </Button>
        </CardContent>
      </Card>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-sm w-full border border-danger-500/30">
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-danger-400" />
                  Account wirklich löschen?
                </h2>
                <p className="text-sm text-slate-400 mt-2">
                  Alle deine Daten (Ablageorte, Gegenstände, Fotos, Profil) werden
                  <span className="text-danger-400 font-semibold"> endgültig gelöscht</span>.
                  Das kann nicht rückgängig gemacht werden.
                </p>
              </div>

              {error && <Alert variant="error">{error}</Alert>}

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-300">
                  Gib <span className="font-mono text-danger-400">{CONFIRM_WORD}</span> ein, um zu bestätigen
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={CONFIRM_WORD}
                  className="w-full h-10 rounded-xl border border-slate-600 bg-slate-800 px-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-danger-500"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowConfirm(false);
                    setConfirmText("");
                    setError(null);
                  }}
                  disabled={isLoading}
                >
                  Abbrechen
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={handleDeleteAccount}
                  isLoading={isLoading}
                  disabled={!canConfirm}
                >
                  Endgültig löschen
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
