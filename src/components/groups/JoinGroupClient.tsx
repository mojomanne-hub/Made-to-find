"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Loader2, CheckCircle2 } from "lucide-react";
import { createBrowserClient }   from "@/lib/supabase/client";
import { savePendingInviteToken, joinPendingGroup } from "@/lib/utils/invite-token";
import { ROUTES } from "@/lib/constants";

interface JoinGroupClientProps {
  token:      string;
  groupName:  string;
  isLoggedIn: boolean;
}

export function JoinGroupClient({ token, groupName, isLoggedIn }: JoinGroupClientProps) {
  const router  = useRouter();
  const [status, setStatus] = useState<"idle" | "joining" | "success" | "error">("idle");
  const [error,  setError]  = useState("");

  useEffect(() => {
    if (!isLoggedIn) {
      // Token für nach dem Login/Register speichern
      savePendingInviteToken(token);
      return;
    }

    // Eingeloggt → direkt beitreten
    async function autoJoin() {
      setStatus("joining");
      try {
        const supabase = createBrowserClient();
        const groupId  = await joinPendingGroup(supabase);
        if (!groupId) throw new Error("Beitritt fehlgeschlagen.");

        // Gruppe als aktiv setzen
        document.cookie = `active-group=${groupId}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
        setStatus("success");
        setTimeout(() => router.push(ROUTES.dashboard), 1500);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Fehler beim Beitreten.");
        setStatus("error");
      }
    }

    autoJoin();
  }, [isLoggedIn, token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#111827" }}>
      <div
        className="w-full max-w-sm rounded-2xl p-8 text-center"
        style={{ backgroundColor: "#1a2535", border: "1px solid #2d3f55" }}
      >
        {/* Icon */}
        <div className="h-16 w-16 rounded-2xl bg-brand-900/50 flex items-center justify-center mx-auto mb-5">
          {status === "success"
            ? <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            : status === "joining"
            ? <Loader2 className="h-8 w-8 text-brand-400 animate-spin" />
            : <Users className="h-8 w-8 text-brand-400" />}
        </div>

        <h1 className="text-xl font-bold text-slate-100 mb-2">
          {status === "success" ? "Erfolgreich beigetreten!" : `„${groupName}" beitreten`}
        </h1>

        {/* Nicht eingeloggt → Login / Register Optionen */}
        {status === "idle" && !isLoggedIn && (
          <>
            <p className="text-sm text-slate-400 mb-6">
              Du wurdest eingeladen, der Gruppe{" "}
              <strong className="text-slate-200">„{groupName}"</strong> beizutreten.
              Melde dich an oder registriere dich — du wirst danach automatisch aufgenommen.
            </p>
            <div className="flex flex-col gap-3">
              <a
                href={`${ROUTES.login}?redirect=/join/${token}`}
                className="w-full h-11 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors flex items-center justify-center"
              >
                Anmelden & Gruppe beitreten
              </a>
              <a
                href={`${ROUTES.register}?redirect=/join/${token}`}
                className="w-full h-11 rounded-xl border border-slate-600 text-slate-300 hover:border-slate-500 hover:bg-slate-700/30 text-sm font-medium transition-colors flex items-center justify-center"
              >
                Registrieren & Gruppe beitreten
              </a>
            </div>
          </>
        )}

        {status === "joining" && (
          <p className="text-sm text-slate-400">Einen Moment…</p>
        )}

        {status === "success" && (
          <p className="text-sm text-slate-400">Du wirst zur Gruppe weitergeleitet…</p>
        )}

        {status === "error" && (
          <>
            <p className="text-sm text-danger-400 mb-4">{error}</p>
            <button
              onClick={() => router.push(ROUTES.dashboard)}
              className="text-sm text-brand-400 hover:text-brand-300"
            >
              Zum Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}
