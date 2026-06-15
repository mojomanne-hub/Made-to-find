/**
 * Login-Seite
 *
 * Was diese Seite tut:
 * - Zeigt das LoginForm (E-Mail + Passwort mit Supabase Auth)
 * - Link zu "Passwort vergessen"
 * - Link zu "Registrieren"
 * - Zeigt nach Redirect einen Info-Hinweis (z.B. nach Registrierung)
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { LoginForm } from "@/components/auth/LoginForm";
import { LoginPageHint } from "@/components/auth/LoginPageHint";

export const metadata: Metadata = {
  title: "Anmelden",
  description: "Melde dich bei MaDe to find an.",
};

export default function LoginPage() {
  return (
    <div className="space-y-6">
      {/* Seitenüberschrift */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight mb-1.5">
          Willkommen zurück
        </h1>
        <p className="text-sm text-neutral-500">
          Melde dich an, um deine Ablageorte zu verwalten
        </p>
      </div>

      {/* Kontextueller Hinweis (z.B. "Bitte melde dich an") */}
      <LoginPageHint />

      {/* Formular */}
      <LoginForm />

      {/* Weiterführende Links */}
      <div className="space-y-3 text-center">
        <p className="text-sm text-neutral-500">
          Noch kein Konto?{" "}
          <Link
            href={ROUTES.register}
            className="text-brand-600 font-semibold hover:text-brand-700 transition-colors"
          >
            Kostenlos registrieren
          </Link>
        </p>
      </div>
    </div>
  );
}
