/**
 * Auth-Layout
 * Zentriertes Layout für Login, Register, Passwort-Reset.
 *
 * Design:
 * - Hintergrund: subtiler Blau-Verlauf (Brand-Farbe aus Logo)
 * - Logo: SVG-Icon (Lupe) + Wortmarke
 * - Kein App-Nav – maximaler Fokus auf die Auth-Aktion
 */

import Link from "next/link";
import { ROUTES } from "@/lib/constants";

function Logo() {
  return (
    <Link
      href={ROUTES.home}
      className="inline-flex items-center gap-3 group"
      aria-label="MaDe to find – Startseite"
    >
      {/* Lupe-Icon – direkt aus dem App-Logo abgeleitet */}
      <div className="relative h-10 w-10 flex-shrink-0">
        <div className="absolute inset-0 rounded-xl bg-brand-700 shadow-md group-hover:bg-brand-800 transition-colors" />
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative h-10 w-10"
          aria-hidden
        >
          {/* Lupen-Kreis */}
          <circle
            cx="17"
            cy="17"
            r="9"
            stroke="#93c5fd"
            strokeWidth="3"
            fill="none"
          />
          {/* Glanzpunkt wie im Logo */}
          <circle cx="13.5" cy="13.5" r="2.5" fill="#bfdbfe" opacity="0.7" />
          {/* Griff */}
          <line
            x1="23.5"
            y1="23.5"
            x2="30"
            y2="30"
            stroke="#93c5fd"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Wortmarke */}
      <div className="leading-tight">
        <span className="block text-base font-bold text-neutral-900 tracking-tight group-hover:text-brand-700 transition-colors">
          MaDe to find
        </span>
        <span className="block text-[11px] text-neutral-400 tracking-widest uppercase font-medium">
          Alles im Blick
        </span>
      </div>
    </Link>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col" style={{
      background: "radial-gradient(ellipse 80% 60% at 50% -10%, #dbeafe 0%, #f8faff 55%, #ffffff 100%)"
    }}>
      {/* Header */}
      <header className="px-6 pt-7 pb-0">
        <Logo />
      </header>

      {/* Hauptinhalt */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[400px] animate-slide-up">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-5 text-center">
        <p className="text-xs text-neutral-400">
          © {new Date().getFullYear()} MaDe to find · Deine Daten bleiben privat
        </p>
      </footer>
    </div>
  );
}
