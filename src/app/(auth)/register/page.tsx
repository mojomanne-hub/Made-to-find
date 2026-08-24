import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { RegisterForm } from "@/components/auth";
export const metadata: Metadata = { title: "Registrieren" };
export default function RegisterPage() {
  return (
    <>
      <div className="mb-7 text-center">
        <h1 className="text-2xl font-bold mb-1" style={{ color: "#f1f5f9" }}>
          Konto erstellen
        </h1>
        <p className="text-sm" style={{ color: "#94a3b8" }}>
          Kostenlos starten – kein Abo, keine Kreditkarte
        </p>
      </div>
      <RegisterForm />
      <p className="mt-5 text-center text-sm" style={{ color: "#94a3b8" }}>
        Bereits registriert?{" "}
        <Link
          href={ROUTES.login}
          className="font-medium"
          style={{ color: "#60a5fa" }}
        >
          Anmelden
        </Link>
      </p>
    </>
  );
}
