"use client";

import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/constants";

interface GoogleSignInButtonProps {
  label?: string;
}

export function GoogleSignInButton({ label = "Mit Google anmelden" }: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);
    const supabase = createBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(ROUTES.dashboard)}`,
      },
    });
    // Browser leitet weiter zu Google – kein weiterer Code nötig.
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className="w-full h-11 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2.5 disabled:opacity-60"
      style={{ backgroundColor: "#ffffff", border: "1px solid #d1d5db", color: "#1f2937" }}
    >
      {isLoading ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
      ) : (
        <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.43 3.58v2.98h3.93c2.3-2.12 3.62-5.24 3.62-8.8z" />
          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.93-2.98c-1.09.73-2.48 1.16-4 1.16-3.08 0-5.68-2.08-6.62-4.87H1.32v3.06C3.28 21.3 7.31 24 12 24z" />
          <path fill="#FBBC05" d="M5.38 14.4A7.2 7.2 0 0 1 5 12c0-.83.14-1.64.38-2.4V6.54H1.32A11.98 11.98 0 0 0 0 12c0 1.94.46 3.77 1.32 5.46l4.06-3.06z" />
          <path fill="#EA4335" d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0 7.31 0 3.28 2.7 1.32 6.54l4.06 3.06C6.32 6.81 8.92 4.77 12 4.77z" />
        </svg>
      )}
      {isLoading ? "Weiterleitung…" : label}
    </button>
  );
}
