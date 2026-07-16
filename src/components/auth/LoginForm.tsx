"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { createBrowserClient }  from "@/lib/supabase/client";
import { joinPendingGroup }      from "@/lib/utils/invite-token";
import { getAuthError }          from "@/lib/utils";
import { ROUTES }                from "@/lib/constants";

export function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const redirectTo   = searchParams.get("redirect") ?? ROUTES.dashboard;

  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [showPwd,   setShowPwd]   = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email:    email.trim(),
        password,
      });

      if (signInError) {
        setError(getAuthError(signInError.message));
        return;
      }

      // Ausstehende Gruppeneinladung annehmen
      const groupId = await joinPendingGroup(supabase);
      if (groupId) {
        document.cookie = `active-group=${groupId}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
      }

      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("Ein Fehler ist aufgetreten. Bitte versuche es erneut.");
    } finally {
      setIsLoading(false);
    }
  }

  const inputCls = "w-full h-11 rounded-xl px-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50";
  const inputStyle = {
    backgroundColor: "#0f1929",
    border: "1px solid #2d3f55",
    color: "#e2e8f0",
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Fehler */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl p-3 text-sm"
          style={{ backgroundColor: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.3)", color: "#fda4af" }}>
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}

      {/* E-Mail */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium" style={{ color: "#94a3b8" }}>
          E-Mail <span style={{ color: "#f43f5e" }}>*</span>
        </label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#475569" }}>
            <Mail className="h-4 w-4" />
          </div>
          <input
            type="email"
            placeholder="deine@email.de"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className={`${inputCls} pl-10`}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Passwort */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium" style={{ color: "#94a3b8" }}>
            Passwort <span style={{ color: "#f43f5e" }}>*</span>
          </label>
          <a href={ROUTES.forgotPassword} className="text-xs transition-colors"
            style={{ color: "#60a5fa" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#93c5fd")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#60a5fa")}
          >
            Vergessen?
          </a>
        </div>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#475569" }}>
            <Lock className="h-4 w-4" />
          </div>
          <input
            type={showPwd ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className={`${inputCls} pl-10 pr-10`}
            style={inputStyle}
          />
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
            style={{ color: "#475569" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#94a3b8")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}
          >
            {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full h-11 rounded-xl text-sm font-semibold text-white transition-all mt-2 flex items-center justify-center gap-2 disabled:opacity-60"
        style={{ backgroundColor: "#2563eb" }}
        onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = "#1d4ed8")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#2563eb")}
      >
        {isLoading ? (
          <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Anmelden…</>
        ) : "Anmelden"}
      </button>
    </form>
  );
}
