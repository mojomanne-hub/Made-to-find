/**
 * Öffentliche Gäste-Ansicht für Ferienwohnungen (über den QR-Code).
 * Ohne Login, nur lesen. Unten Werbung für die App.
 */

import type { Metadata } from "next";
import * as LucideIcons from "lucide-react";
import { getPublicInventory, type PublicItem } from "@/lib/utils/public-inventory";
import {
  PublicInventoryView,
  type PublicLocationView,
  type PublicSectionView,
} from "@/components/public/PublicInventoryView";

export const dynamic = "force-dynamic";

const LANDING_URL    = "https://www.madetofind.de";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=de.madetofind.app";

interface Props { params: Promise<{ token: string }> }

function DynIcon({ name, fallback, className, emojiClass }: {
  name: string | null; fallback: "MapPin" | "Box"; className?: string; emojiClass?: string;
}) {
  const icons = LucideIcons as unknown as Record<string, React.FC<{ className?: string }>>;
  if (name) {
    // Emoji-Erkennung wie im Rest der App: max 4 Zeichen und nicht mit Großbuchstaben
    if (name.length <= 4 && !/^[A-Z]/.test(name)) {
      return <span className={emojiClass ?? "text-xl leading-none"}>{name}</span>;
    }
    const Icon = icons[name];
    if (Icon) return <Icon className={className} />;
  }
  const Fallback = icons[fallback];
  return <Fallback className={className} />;
}

function itemVisual(item: PublicItem) {
  if (item.image_url) {
    return (
      <a href={item.image_url} target="_blank" rel="noopener noreferrer" className="block h-full w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
      </a>
    );
  }
  const color = item.color ?? "#94a3b8";
  return (
    <span className="h-full w-full flex items-center justify-center"
      style={{ backgroundColor: (item.color ?? "#334155") + (item.color ? "30" : ""), color }}>
      <DynIcon name={item.icon} fallback="Box" className="h-[18px] w-[18px]" emojiClass="text-lg leading-none" />
    </span>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const data = await getPublicInventory(token);
  const title = data ? `${data.group_name} – Was liegt wo?` : "Link ungültig";
  return {
    title,
    description: "Hier findest du alles in der Unterkunft – erstellt mit MaDe to find.",
    // Private Unterkünfte sollen nicht bei Google auftauchen
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description: "Hier findest du alles in der Unterkunft – erstellt mit MaDe to find.",
      images: [{ url: "/icons/icon-512x512.png", width: 512, height: 512 }],
    },
  };
}

export default async function PublicGuestPage({ params }: Props) {
  const { token } = await params;
  const data = await getPublicInventory(token);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: "#111827" }}>
        <div className="max-w-sm text-center space-y-3">
          <LucideIcons.QrCode className="h-10 w-10 text-slate-500 mx-auto" />
          <h1 className="text-lg font-semibold text-slate-100">Dieser Link ist nicht mehr gültig</h1>
          <p className="text-sm text-slate-400">
            Der QR-Code wurde vermutlich erneuert. Frag bitte deinen Gastgeber nach dem aktuellen Code.
          </p>
          <a href={LANDING_URL} className="inline-block text-sm text-brand-400 hover:text-brand-300">
            Was ist MaDe to find?
          </a>
        </div>
      </div>
    );
  }

  // Ablageorte mit Fächern und Gegenständen zusammenbauen
  const locations: PublicLocationView[] = data.locations.map((loc) => {
    const color   = loc.color ?? "#3b82f6";
    const items   = data.items.filter((i) => i.location_id === loc.id);
    const shelves = data.shelves.filter((s) => s.location_id === loc.id);
    const toView  = (i: PublicItem) => ({
      id: i.id, name: i.name, description: i.description, quantity: i.quantity, visual: itemVisual(i),
    });

    let sections: PublicSectionView[];
    if (shelves.length > 0) {
      sections = shelves
        .map((s) => ({ key: s.id, title: s.name, items: items.filter((i) => i.shelf_id === s.id).map(toView) }))
        .filter((s) => s.items.length > 0);
      const rest = items.filter((i) => !i.shelf_id || !shelves.some((s) => s.id === i.shelf_id));
      if (rest.length) sections.push({ key: "rest", title: "Ohne Fach", items: rest.map(toView) });
    } else {
      sections = items.length ? [{ key: "all", title: null, items: items.map(toView) }] : [];
    }

    return {
      id: loc.id, name: loc.name, description: loc.description, color,
      imageUrl: loc.image_url,
      visual: loc.image_url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={loc.image_url} alt="" className="h-full w-full object-cover" />
        : <DynIcon name={loc.icon} fallback="MapPin" className="h-5 w-5" emojiClass="text-2xl leading-none" />,
      itemCount: items.length,
      sections,
    };
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#111827" }}>
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-28">

        {/* Kopf */}
        <header className="mb-5">
          <div className="flex items-center gap-2 mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192x192.png" alt="" className="h-7 w-7 rounded-lg" />
            <span className="text-xs font-medium text-slate-500">MaDe to find</span>
          </div>
          <p className="text-sm text-slate-400">Willkommen in</p>
          <h1 className="text-2xl font-bold text-slate-100">{data.group_name}</h1>
          <p className="text-sm text-slate-400 mt-1">Hier findest du, wo alles liegt. Schönen Aufenthalt! 🌿</p>
        </header>

        <PublicInventoryView locations={locations} token={token} />

        {/* Werbung für die App */}
        <section className="mt-10 rounded-2xl p-5 border border-brand-800/60"
          style={{ background: "linear-gradient(135deg, #1e3a8a55, #1a2535)" }}>
          <div className="flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192x192.png" alt="" className="h-12 w-12 rounded-xl flex-shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-slate-100">Diese Übersicht wurde mit MaDe to find erstellt</h2>
              <p className="text-sm text-slate-400 mt-1">
                Nie wieder suchen – auch nicht zu Hause. Halte fest, was wo liegt, und teile es mit Familie, Mitbewohnern oder Gästen.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
            <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer"
              className="h-11 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors">
              <LucideIcons.Download className="h-4 w-4" /> Kostenlos im Play Store
            </a>
            <a href={LANDING_URL} target="_blank" rel="noopener noreferrer"
              className="h-11 rounded-xl border border-slate-600 text-slate-200 hover:bg-slate-700/40 text-sm font-medium flex items-center justify-center gap-2 transition-colors">
              Mehr erfahren
            </a>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Selbst Vermieter? Erstelle deinen eigenen Gäste-QR-Code in wenigen Minuten.
          </p>
        </section>
      </div>

      {/* Schmale Leiste unten */}
      <a href={LANDING_URL} target="_blank" rel="noopener noreferrer"
        className="fixed bottom-0 inset-x-0 z-40 flex items-center justify-center gap-2 py-3 text-xs text-slate-300 border-t border-slate-700/70 backdrop-blur"
        style={{ backgroundColor: "#111827e6" }}>
        <span>Erstellt mit <strong className="text-slate-100">MaDe to find</strong></span>
        <span className="text-brand-400 font-medium">· Kostenlos testen →</span>
      </a>
    </div>
  );
}
