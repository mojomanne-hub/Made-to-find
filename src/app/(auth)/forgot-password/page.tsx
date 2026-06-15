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
        className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-7 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Zurück zum Login
      </Link>

      <div className="mb-7">
        <h1 className="text-2xl font-bold text-neutral-900 mb-1">
          Passwort zurücksetzen
        </h1>
        <p className="text-sm text-neutral-500 leading-relaxed">
          Gib deine E-Mail-Adresse ein. Wir senden dir einen Link,
          mit dem du ein neues Passwort festlegen kannst.
        </p>
      </div>

      <ForgotPasswordForm />
    </>
  );
}
