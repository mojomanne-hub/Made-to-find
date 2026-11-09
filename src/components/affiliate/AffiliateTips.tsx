import { ShoppingBag, ChevronDown } from "lucide-react";
import { AMAZON_TAG, AFFILIATE_DISCLOSURE, amazonSearchUrl, tipsForLocation, matchedTipsForLocation, matchedTipsForItem } from "@/lib/affiliate";

interface Props {
  locationName: string;
  description?: string | null;
  /** true: nur anzeigen, wenn der Name wirklich zu einer Tipp-Gruppe passt (für das Formular „Neuer Ablageort“) */
  onlyIfMatch?: boolean;
  /** "item": Tipps zum Namen eines Gegenstands (nur bei Treffer) */
  kind?: "location" | "item";
  /** true: Karte startet aufgeklappt */
  defaultOpen?: boolean;
  /** Abstand/Layout von außen (Standard: mt-6) */
  className?: string;
}

/**
 * Einklappbare Karte „Ordnungs-Tipps“ für die Ablageort-Seite.
 * Zeigt nichts, solange NEXT_PUBLIC_AMAZON_TAG nicht gesetzt ist.
 * Links als Werbung gekennzeichnet (rel="sponsored"), keine Preise, kein Tracking-Skript auf unserer Seite.
 */
export function AffiliateTips({ locationName, description, onlyIfMatch, kind = "location", defaultOpen, className = "mt-6" }: Props) {
  if (!AMAZON_TAG) return null;
  const tips =
    kind === "item"
      ? matchedTipsForItem(locationName)
      : onlyIfMatch
        ? matchedTipsForLocation(locationName, description)
        : tipsForLocation(locationName, description);
  if (tips.length === 0) return null;

  return (
    <details open={defaultOpen} className={`group ${className} rounded-2xl border border-slate-700 bg-slate-800/40`}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm text-slate-300 hover:text-slate-100">
        <ShoppingBag className="h-4 w-4 text-brand-400" />
        <span className="font-medium">Ordnungs-Tipps für „{locationName}“</span>
        <span className="ml-1 rounded-md border border-slate-600 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">Anzeige</span>
        <ChevronDown className="ml-auto h-4 w-4 text-slate-500 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-2 px-4 pb-4">
        <ul className="grid gap-2 sm:grid-cols-2">
          {tips.map((t) => (
            <li key={t.query}>
              <a
                href={amazonSearchUrl(t.query)}
                target="_blank"
                rel="sponsored nofollow noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-slate-600 px-3 py-2.5 text-sm text-slate-200 transition-colors hover:border-slate-400 hover:bg-slate-700"
              >
                <span className="text-xl">{t.emoji}</span>
                <span className="flex-1">{t.label}</span>
                <span className="text-xs text-slate-500">Amazon ↗</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="text-[11px] leading-snug text-slate-500">
          Werbung – {AFFILIATE_DISCLOSURE} Für dich ändert sich am Preis nichts.
        </p>
      </div>
    </details>
  );
}
