"use client";

/**
 * LocationsGrid – Kachel-Ansicht für Ablageorte.
 * Gleiche Struktur wie ItemsGrid – Suchleiste + große Farbkacheln.
 */

import { useState, useMemo } from "react";
import Link from "next/link";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import { EmptyState } from "@/components/ui/Badge";
import { Button }     from "@/components/ui/Button";

function DynIcon({ name, className }: { name: string | null; className?: string }) {
  const Icon = name
    ? (LucideIcons as unknown as Record<string, React.FC<{ className?: string }>>)[name]
    : null;
  const Comp = Icon ?? LucideIcons.MapPin;
  return <Comp className={className} />;
}

interface LocationWithCount {
  id:          string;
  name:        string;
  description: string | null;
  color:       string | null;
  icon:        string | null;
  image_url:   string | null;
  updated_at:  string;
  items:       { count: number }[];
}

interface LocationsGridProps {
  locations: LocationWithCount[];
}

const DEFAULT_COLORS = [
  "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b",
  "#ef4444", "#ec4899", "#6b7280",
];

export function LocationsGrid({ locations }: LocationsGridProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() =>
    locations.filter((loc) =>
      !search ||
      loc.name.toLowerCase().includes(search.toLowerCase()) ||
      (loc.description ?? "").toLowerCase().includes(search.toLowerCase())
    ),
    [locations, search]
  );

  return (
    <div className="space-y-4">
      {/* Suchleiste */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
          <LucideIcons.Search className="h-4 w-4" />
        </div>
        <input
          type="search"
          placeholder="Ablageort suchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 rounded-xl pl-10 pr-4 text-sm bg-[#1a2535] border border-slate-700 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Kacheln */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-700" style={{ backgroundColor: "#1a2535" }}>
          <EmptyState
            icon={<LucideIcons.MapPin />}
            title={search ? "Keine Ergebnisse" : "Noch keine Ablageorte"}
            description={
              search
                ? "Versuche einen anderen Suchbegriff."
                : "Erstelle deinen ersten Ablageort."
            }
            action={
              !search ? (
                <Link href={ROUTES.locationNew}>
                  <Button size="sm">
                    <LucideIcons.Plus className="h-4 w-4" /> Ersten Ablageort erstellen
                  </Button>
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((loc, index) => {
            const color = loc.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length];
            const itemCount = loc.items?.[0]?.count ?? 0;

            return (
              <Link key={loc.id} href={ROUTES.locationDetail(loc.id)}>
                <div className="rounded-2xl overflow-hidden border border-slate-700 hover:border-slate-500 hover:scale-[1.02] transition-all duration-150 cursor-pointer">
                  {/* Farb-Banner mit Icon */}
                  <div
                    className="h-28 flex items-center justify-center relative"
                    style={{ backgroundColor: color }}
                  >
                    {loc.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={loc.image_url}
                        alt={loc.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <DynIcon name={loc.icon} className="h-12 w-12 text-white/80" />
                    )}
                    {/* Artikel-Anzahl Badge */}
                    <div className="absolute top-2 right-2 bg-black/30 backdrop-blur-sm text-white text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <LucideIcons.Package className="h-3 w-3" />
                      {itemCount}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3" style={{ backgroundColor: "#1e2a3a" }}>
                    <p className="text-sm font-semibold text-slate-100 truncate">{loc.name}</p>
                    {loc.description && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">{loc.description}</p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
