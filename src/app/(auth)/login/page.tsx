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
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Willkommen zurück
        </h1>
        <p className="text-sm" style={{ color: "#94a3b8" }}>
          Melde dich an, um deine Ablageorte zu verwalten
        </p>
      </div>

      <LoginPageHint />

      {/* Formular-Card */}
      <div
        className="rounded-2xl p-6"
        style={{
          backgroundColor: "#1a2535",
          border: "1px solid #2d3f55",
          boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
        }}
      >
        <LoginForm />
      </div>

      {/* Register Link */}
      <p className="text-center text-sm" style={{ color: "#94a3b8" }}>
        Noch kein Konto?{" "}
        <Link
          href={ROUTES.register}
          className="text-brand-400 font-semibold hover:text-brand-300 transition-colors"
        >
          Kostenlos registrieren
        </Link>
      </p>
    </div>
  );
}
