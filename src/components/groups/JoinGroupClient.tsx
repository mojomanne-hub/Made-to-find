"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, Check, X, Loader2, LogIn } from "lucide-react";
import { createBrowserClient }      from "@/lib/supabase/client";
import { savePendingInviteToken }   from "@/lib/utils/invite-token";
import { ROUTES }                   from "@/lib/constants";
import Image from "next/image";

interface JoinGroupClientProps {
  token:      string;
  groupName:  string;
  isLoggedIn: boolean;
}

export function JoinGroupClient({ token, groupName, isLoggedIn }: JoinGroupClientProps) {
  const router      = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [joined,    setJoined]    = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      savePendingInviteToken(token);
    }
  }, [token, isLoggedIn]);

  async function handleJoin() {
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createBrowserClient();
      const { data: groupId, error: jErr } = await supabase.rpc("join_group_by_token", { token });
      if (jErr) throw jErr;
      document.cookie = `active-group=${groupId}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
      setJoined(true);
      setTimeout(() => {
        router.push(ROUTES.dashboard);
        router.refresh();
      }, 1500);
    } catch {
      setError("Der Einladungslink ist ungültig oder abgelaufen.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleLogin() {
    window.location.href = ROUTES.login;
  }

  function handleRegister() {
    window.location.href = ROUTES.register;
  }

  function handleDecline() {
    router.push(ROUTES.dashboard);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: "#111827" }}>
      <div className="mb-8 text-center">
        <div className="h-16 w-16 rounded-2xl overflow-hidden shadow-2xl shadow-brand-900/50 mx-auto">
          <Image src="/icons/icon-192x192.png" alt="MaDe to find" width={64} height={64} />
        </div>
        <p className="text-sm font-medium text-slate-400 mt-3">MaDe to find</p>
      </div>

      <div className="w-full max-w-sm rounded-2xl p-6 text-center"
        style={{ backgroundColor: "#1a2535", border: "1px solid #2d3f55", boxShadow: "0 25px 50px rgba(0,0,0,0.4)" }}>

        {joined ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="h-14 w-14 rounded-full bg-emerald-600/20 flex items-center justify-center">
              <Check className="h-7 w-7 text-emerald-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">Willkommen!</p>
              <p className="text-sm text-slate-400 mt-1">Du bist der Gruppe beigetreten.</p>
            </div>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-brand-400" />
          </div>
        ) : (
          <>
            <div className="h-14 w-14 rounded-2xl bg-brand-900/50 flex items-center justify-center mx-auto mb-4">
              <Users className="h-7 w-7 text-brand-400" />
            </div>

            <h1 className="text-xl font-bold text-white mb-2">Gruppeneinladung</h1>
            <p className="text-slate-400 text-sm mb-1">Du wurdest eingeladen, der Gruppe</p>
            <p className="text-lg font-bold text-white mb-1">„{groupName}"</p>
            <p className="text-slate-400 text-sm mb-6">beizutreten.</p>

            {error && (
              <div className="mb-4 px-3 py-2 rounded-xl text-xs text-red-300"
                style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                {error}
              </div>
            )}

            {isLoggedIn ? (
              <div className="flex gap-3">
                <button onClick={handleDecline}
                  className="flex-1 h-11 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium">
                  <X className="h-4 w-4" /> Ablehnen
                </button>
                <button onClick={handleJoin} disabled={isLoading}
                  className="flex-1 h-11 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white transition-colors flex items-center justify-center gap-2 text-sm font-semibold">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> Beitreten</>}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-slate-500 mb-1">
                  Melde dich an oder erstelle ein kostenloses Konto um beizutreten.
                </p>
                <button onClick={handleLogin}
                  className="w-full h-11 rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-colors flex items-center justify-center gap-2 text-sm font-semibold">
                  <LogIn className="h-4 w-4" /> Anmelden & beitreten
                </button>
                <button onClick={handleRegister}
                  className="w-full h-11 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium">
                  Kostenlos registrieren
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
