import type { Metadata } from "next";
import Link from "next/link";
import { ARTICLES } from "@/lib/ratgeber/articles";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Ratgeber: Ordnung & Aufbewahrung",
  description: "Praktische Tipps zum Aufräumen, Ordnen und Wiederfinden – vom Keller bis zur Inventarliste.",
  alternates: { canonical: "/ratgeber" },
};

export default function RatgeberIndexPage() {
  return (
    <main className="min-h-screen bg-slate-900 text-slate-200">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-sm text-slate-400">
          <Link href="/" className="hover:text-slate-200">MaDe to find</Link> · Ratgeber
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-100">Ordnung & Aufbewahrung</h1>
        <p className="mt-2 text-slate-400">
          Praktische Tipps zum Aufräumen, Ordnen und Wiederfinden.
        </p>

        <ul className="mt-8 space-y-3">
          {ARTICLES.map((a) => (
            <li key={a.slug}>
              <Link
                href={`/ratgeber/${a.slug}`}
                className="flex gap-4 rounded-2xl border border-slate-700 bg-slate-800/40 p-4 transition-colors hover:border-slate-500"
              >
                <span className="text-3xl">{a.emoji}</span>
                <span>
                  <span className="block font-semibold text-slate-100">{a.title}</span>
                  <span className="mt-1 block text-sm text-slate-400">{a.description}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-10 rounded-2xl border border-brand-500/30 bg-brand-900/20 p-5">
          <p className="font-semibold text-slate-100">Nie wieder suchen</p>
          <p className="mt-1 text-sm text-slate-300">
            Mit „MaDe to find“ hältst du fest, was wo liegt – mit Foto, Suche und Gruppen für die Familie.
          </p>
          <Link href={ROUTES.login} className="mt-3 inline-block rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500">
            Kostenlos ausprobieren
          </Link>
        </div>
      </div>
    </main>
  );
}
