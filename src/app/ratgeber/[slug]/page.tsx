import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ARTICLES, getArticle } from "@/lib/ratgeber/articles";
import { AFFILIATE_DISCLOSURE, AMAZON_TAG, amazonSearchUrl } from "@/lib/affiliate";
import { ROUTES } from "@/lib/constants";

interface Props { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const a = getArticle(slug);
  if (!a) return {};
  return {
    title: a.title,
    description: a.description,
    alternates: { canonical: `/ratgeber/${a.slug}` },
    openGraph: { title: a.title, description: a.description, type: "article" },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const a = getArticle(slug);
  if (!a) notFound();

  return (
    <main className="min-h-screen bg-slate-900 text-slate-200">
      <article className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-sm text-slate-400">
          <Link href="/ratgeber" className="hover:text-slate-200">← Ratgeber</Link>
        </p>
        <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-100">{a.emoji} {a.title}</h1>
        <p className="mt-1 text-xs text-slate-500">
          Stand: {new Date(a.date).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
        </p>
        <p className="mt-5 text-lg text-slate-300">{a.intro}</p>

        {a.sections.map((s) => (
          <section key={s.heading} className="mt-8">
            <h2 className="text-xl font-semibold text-slate-100">{s.heading}</h2>
            {s.paragraphs.map((p, i) => (
              <p key={i} className="mt-3 leading-relaxed text-slate-300">{p}</p>
            ))}
            {s.list && (
              <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-300">
                {s.list.map((li) => <li key={li}>{li}</li>)}
              </ul>
            )}
          </section>
        ))}

        {AMAZON_TAG && (
          <section className="mt-10 rounded-2xl border border-slate-700 bg-slate-800/40 p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
              Hilfreiche Helfer
              <span className="rounded-md border border-slate-600 px-1.5 py-0.5 text-[10px] font-normal uppercase tracking-wide text-slate-400">Anzeige</span>
            </h2>
            <ul className="mt-3 space-y-2">
              {a.products.map((p) => (
                <li key={p.query}>
                  <a
                    href={amazonSearchUrl(p.query)}
                    target="_blank"
                    rel="sponsored nofollow noopener noreferrer"
                    className="flex items-center justify-between rounded-xl border border-slate-600 px-3 py-2.5 text-sm hover:border-slate-400 hover:bg-slate-700"
                  >
                    <span>{p.label}</span>
                    <span className="text-xs text-slate-500">Amazon ↗</span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-slate-500">Werbung – {AFFILIATE_DISCLOSURE} Für dich ändert sich am Preis nichts.</p>
          </section>
        )}

        <div className="mt-10 rounded-2xl border border-brand-500/30 bg-brand-900/20 p-5">
          <p className="font-semibold text-slate-100">Ordnung festhalten statt vergessen</p>
          <p className="mt-1 text-sm text-slate-300">
            „MaDe to find“ merkt sich, was wo liegt. Mit Foto, Suche und gemeinsamen Gruppen für die Familie.
          </p>
          <Link href={ROUTES.login} className="mt-3 inline-block rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500">
            Kostenlos ausprobieren
          </Link>
        </div>
      </article>
    </main>
  );
}
