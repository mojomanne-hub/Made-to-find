import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
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
      {/* Logo zentriert */}
      <div className="flex flex-col items-center gap-3">
        <div className="h-20 w-20 rounded-2xl overflow-hidden shadow-2xl shadow-brand-900/50">
          <Image
            src="/icons/icon-512x512.png"
            alt="MaDe to find"
            width={80}
            height={80}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Willkommen zurück
          </h1>
          <p className="text-sm mt-1" style={{ color: "#94a3b8" }}>
            Melde dich an, um deine Ablageorte zu verwalten
          </p>
        </div>
      </div>

      <Suspense>
        <LoginPageHint />
      </Suspense>

      <div
        className="rounded-2xl p-6"
        style={{
          backgroundColor: "#1a2535",
          border: "1px solid #2d3f55",
          boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
        }}
      >
        <Suspense fallback={<div className="h-40" />}>
          <LoginForm />
        </Suspense>
      </div>

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
