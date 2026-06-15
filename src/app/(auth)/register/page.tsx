import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { RegisterForm } from "@/components/auth";

export const metadata: Metadata = { title: "Registrieren" };

export default function RegisterPage() {
  return (
    <>
      <div className="mb-7 text-center">
        <h1 className="text-2xl font-bold text-neutral-900 mb-1">
          Konto erstellen
        </h1>
        <p className="text-sm text-neutral-500">
          Kostenlos starten – kein Abo, keine Kreditkarte
        </p>
      </div>

      <RegisterForm />

      <p className="mt-5 text-center text-sm text-neutral-500">
        Bereits registriert?{" "}
        <Link
          href={ROUTES.login}
          className="text-brand-600 font-medium hover:text-brand-700"
        >
          Anmelden
        </Link>
      </p>
    </>
  );
}
