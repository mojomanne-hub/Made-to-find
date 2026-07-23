"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import { EmptyState } from "@/components/ui/Badge";
import { Button }     from "@/components/ui/Button";
import { createBrowserClient } from "@/lib/supabase/client";

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

export function LocationsGrid({ locations: initialLocations }: LocationsGridProps) {
  const [search,    setSearch]    = useState("");
  const [locations, setLocations] = useState(initialLocations);
  const [deleting,  setDeleting]  = useState<string | null>(null);
  const [view,      setView]      = useState<"grid" | "list">("grid");
  const router = useRouter();

  const filtered = useMemo(() =>
    locations.filter((loc) =>
      !search ||
      loc.name.toLowerCase().includes(search.toLowerCase()) ||
      (loc.description ?? "").toLowerCase().includes(search.toLowerCase())
    ),
    [locations, search]
  );

  async function handleDelete(e: React.MouseEvent, loc: LocationWithCount) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`"${loc.name}" wirklich löschen?`)) return;
    setDeleting(loc.id);
    try {
      const supabase = createBrowserClient();
      await supabase.from("locations").update({ deleted_at: new Date().toISOString() }).eq("id", loc.id);
      setLocations((prev) => prev.filter((l) => l.id !== loc.id));
      router.refresh();
    } finally {
      setDeleting(null);
    }
  }

  function handleEdit(e: React.MouseEvent, locId: string) {
    e.preventDefault();
    e.stopPropagation();
    router.push(ROUTES.locationEdit(locId));
  }

  return (
    <div className="space-y-4">
      {/* Suchleiste + View Toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
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
        {/* Toggle */}
        <div className="flex rounded-xl overflow-hidden border border-slate-700">
          <button
            onClick={() => setView("grid")}
            className={cn("h-10 w-10 flex items-center justify-center transition-colors",
              view === "grid" ? "bg-brand-600 text-white" : "bg-[#1a2535] text-slate-400 hover:text-slate-200")}
            title="Kachelansicht"
          >
            <LucideIcons.LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("list")}
            className={cn("h-10 w-10 flex items-center justify-center transition-colors",
              view === "list" ? "bg-brand-600 text-white" : "bg-[#1a2535] text-slate-400 hover:text-slate-200")}
            title="Listenansicht"
          >
            <LucideIcons.List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Inhalt */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-700" style={{ backgroundColor: "#1a2535" }}>
          <EmptyState
            icon={<LucideIcons.MapPin />}
            title={search ? "Keine Ergebnisse" : "Noch keine Ablageorte"}
            description={search ? "Versuche einen anderen Suchbegriff." : "Erstelle deinen ersten Ablageort."}
            action={
              !search ? (
                <Link href={ROUTES.locationNew}>
                  <Button size="sm"><LucideIcons.Plus className="h-4 w-4" /> Ersten Ablageort erstellen</Button>
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : view === "grid" ? (
        /* ── Kachelansicht ── */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((loc, index) => {
            const color = loc.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length];
            const itemCount = loc.items?.[0]?.count ?? 0;
            return (
              <Link key={loc.id} href={ROUTES.locationDetail(loc.id)}>
                <div className="rounded-2xl overflow-hidden border border-slate-700 hover:border-slate-500 hover:scale-[1.02] transition-all duration-150 cursor-pointer">
                  <div className="h-28 flex items-center justify-center relative" style={{ backgroundColor: color }}>
                    {loc.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={loc.image_url} alt={loc.name} className="h-full w-full object-cover" />
                    ) : (
                      <DynIcon name={loc.icon} className="h-12 w-12 text-white/80" />
                    )}
                    <div className="absolute top-2 right-2 bg-black/30 backdrop-blur-sm text-white text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <LucideIcons.Package className="h-3 w-3" />{itemCount}
                    </div>
                  </div>
                  <div className="p-3 flex items-center justify-between gap-2" style={{ backgroundColor: "#1e2a3a" }}>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-100 truncate">{loc.name}</p>
                      {loc.description && <p className="text-xs text-slate-500 truncate mt-0.5">{loc.description}</p>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={(e) => handleEdit(e, loc.id)} className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-slate-700 transition-colors" title="Bearbeiten">
                        <LucideIcons.Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={(e) => handleDelete(e, loc)} disabled={deleting === loc.id} className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-danger-400 hover:bg-danger-900/30 transition-colors" title="Löschen">
                        {deleting === loc.id ? <LucideIcons.Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LucideIcons.Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        /* ── Listenansicht ── */
        <div className="flex flex-col gap-1.5">
          {filtered.map((loc, index) => {
            const color = loc.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length];
            const itemCount = loc.items?.[0]?.count ?? 0;
            return (
              <Link key={loc.id} href={ROUTES.locationDetail(loc.id)}>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-700 hover:border-slate-500 hover:bg-slate-700/20 transition-all cursor-pointer" style={{ backgroundColor: "#1a2535" }}>
                  {/* Farb-Icon */}
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color }}>
                    {loc.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={loc.image_url} alt={loc.name} className="h-full w-full object-cover rounded-xl" />
                    ) : (
                      <DynIcon name={loc.icon} className="h-5 w-5 text-white/90" />
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-100 truncate">{loc.name}</p>
                    {loc.description && <p className="text-xs text-slate-500 truncate">{loc.description}</p>}
                  </div>
                  {/* Artikel-Anzahl */}
                  <div className="flex items-center gap-1 text-xs text-slate-500 flex-shrink-0">
                    <LucideIcons.Package className="h-3.5 w-3.5" />
                    {itemCount}
                  </div>
                  {/* Buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={(e) => handleEdit(e, loc.id)} className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-slate-700 transition-colors" title="Bearbeiten">
                      <LucideIcons.Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={(e) => handleDelete(e, loc)} disabled={deleting === loc.id} className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-danger-400 hover:bg-danger-900/30 transition-colors" title="Löschen">
                      {deleting === loc.id ? <LucideIcons.Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LucideIcons.Trash2 className="h-3.5 w-3.5" />}
                    </button>
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
