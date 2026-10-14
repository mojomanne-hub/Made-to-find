"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, Check, X, Loader2, LogIn, MapPin, Bell } from "lucide-react";
import { createBrowserClient }      from "@/lib/supabase/client";
import { savePendingInviteToken }   from "@/lib/utils/invite-token";
import { ROUTES }                   from "@/lib/constants";
import Image from "next/image";

// Gleiche Farblogik wie im Gruppen-Dropdown, damit die Gruppe überall gleich aussieht
const GROUP_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

function groupColor(seed: string) {
  let hash = 0;
  for (const c of seed) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return GROUP_COLORS[Math.abs(hash) % GROUP_COLORS.length];
}

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

  const color   = groupColor(token);
  const initial = groupName.trim()[0]?.toUpperCase() ?? "G";

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

  const perks = [
    { icon: MapPin, text: "Gemeinsame Ablageorte und Gegenstände" },
    { icon: Users,  text: "Alle Mitglieder sehen, was wo liegt" },
    { icon: Bell,   text: "Benachrichtigungen bei neuen Einträgen" },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8" style={{ backgroundColor: "#111827" }}>
      <div className="mb-8 text-center">
        <div className="h-16 w-16 rounded-2xl overflow-hidden shadow-2xl shadow-brand-900/50 mx-auto">
          <Image src="/icons/icon-192x192.png" alt="MaDe to find" width={64} height={64} />
        </div>
        <p className="text-sm font-medium mt-3" style={{ color: "#94a3b8" }}>MaDe to find</p>
      </div>

      <div
        className="w-full max-w-sm rounded-2xl px-6 py-8 text-center"
        style={{ backgroundColor: "#1a2535", border: "1px solid #2d3f55", boxShadow: "0 25px 50px rgba(0,0,0,0.4)" }}
      >
        {joined ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <div
              className="h-16 w-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.35)" }}
            >
              <Check className="h-8 w-8" style={{ color: "#34d399" }} strokeWidth={3} />
            </div>
            <div>
              <p className="text-xl font-bold" style={{ color: "#f1f5f9" }}>Willkommen in der Gruppe!</p>
              <p className="text-sm mt-1" style={{ color: "#94a3b8" }}>
                Du bist „{groupName}“ beigetreten. Wir leiten dich weiter …
              </p>
            </div>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-brand-400" />
          </div>
        ) : (
          <>
            {/* Gruppen-Avatar */}
            <div className="relative mx-auto mb-5 h-20 w-20">
              <div
                className="h-20 w-20 rounded-full flex items-center justify-center text-3xl font-bold text-white"
                style={{ backgroundColor: color, boxShadow: `0 8px 30px ${color}55` }}
              >
                {initial}
              </div>
              <span
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#1e3a6e", border: "3px solid #1a2535" }}
              >
                <Users className="h-3.5 w-3.5 text-white" />
              </span>
            </div>

            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#60a5fa" }}>
              Du wurdest eingeladen
            </p>
            <h1 className="text-2xl font-bold mb-2 break-words" style={{ color: "#f1f5f9" }}>
              {groupName}
            </h1>
            <p className="text-sm mb-6" style={{ color: "#94a3b8" }}>
              Tritt der Gruppe bei und verwalte Ablageorte und Gegenstände gemeinsam.
            </p>

            {/* Vorteile */}
            <ul className="mb-6 space-y-2.5 text-left">
              {perks.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3">
                  <span
                    className="h-8 w-8 rounded-lg flex-shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: "rgba(59,130,246,0.12)" }}
                  >
                    <Icon className="h-4 w-4" style={{ color: "#60a5fa" }} />
                  </span>
                  <span className="text-sm" style={{ color: "#cbd5e1" }}>{text}</span>
                </li>
              ))}
            </ul>

            {error && (
              <div
                className="mb-4 px-3 py-2 rounded-xl text-xs text-red-300"
                style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}
              >
                {error}
              </div>
            )}

            {isLoggedIn ? (
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleJoin}
                  disabled={isLoading}
                  className="w-full h-12 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> Gruppe beitreten</>}
                </button>
                <button
                  onClick={handleDecline}
                  className="w-full h-10 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors hover:text-slate-200"
                  style={{ color: "#94a3b8" }}
                >
                  <X className="h-4 w-4" /> Nicht jetzt
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-xs mb-1" style={{ color: "#64748b" }}>
                  Melde dich an oder erstelle ein kostenloses Konto, um beizutreten. Die Einladung bleibt dabei erhalten.
                </p>
                <button
                  onClick={handleLogin}
                  className="w-full h-12 rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
                >
                  <LogIn className="h-4 w-4" /> Anmelden und beitreten
                </button>
                <button
                  onClick={handleRegister}
                  className="w-full h-11 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                >
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
