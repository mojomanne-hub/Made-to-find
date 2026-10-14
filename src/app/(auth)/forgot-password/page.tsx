import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ROUTES } from "@/lib/constants";
import { ForgotPasswordForm } from "@/components/auth";

export const metadata: Metadata = { title: "Passwort vergessen" };

export default function ForgotPasswordPage() {
  return (
    <>
      {/* Zurück-Link */}
      <Link
        href={ROUTES.login}
        className="inline-flex items-center gap-1 text-sm mb-7 transition-colors hover:text-slate-200"
        style={{ color: "#94a3b8" }}
      >
        <ChevronLeft className="h-4 w-4" />
        Zurück zum Login
      </Link>

      <div className="mb-7 text-center">
        <h1 className="text-2xl font-bold mb-2" style={{ color: "#f1f5f9" }}>
          Passwort zurücksetzen
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: "#94a3b8" }}>
          Gib deine E-Mail-Adresse ein. Wir senden dir einen Link,
          mit dem du ein neues Passwort festlegen kannst.
        </p>
      </div>

      <ForgotPasswordForm />
    </>
  );
}
