"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as LucideIcons from "lucide-react";
import { ROUTES } from "@/lib/constants";
import { EmptyState } from "@/components/ui/Badge";
import { Button }     from "@/components/ui/Button";
import { createBrowserClient } from "@/lib/supabase/client";

function DynIcon({ name, className }: { name: string | null; className?: string }) {
  const Icon = name
    ? (LucideIcons as unknown as Record<string, React.FC<{ className?: string }>>)[name]
    : null;
  const Comp = Icon ?? LucideIcons.Box;
  return <Comp className={className} />;
}

interface Item {
  id:          string;
  name:        string;
  description: string | null;
  quantity:    number;
  color:       string | null;
  icon:        string | null;
  image_url:   string | null;
  location_id: string;
  updated_at:  string;
  locations:   { id: string; name: string; color: string | null } | null;
}

interface LocationOption {
  id:   string;
  name: string;
}

interface ItemsGridProps {
  items:     Item[];
  locations: LocationOption[];
}

const DEFAULT_COLORS = [
  "#f59e0b", "#8b5cf6", "#3b82f6", "#10b981",
  "#ef4444", "#ec4899", "#6b7280",
];

function getItemColor(item: Item, index: number): string {
  if (item.color) return item.color;
  if (item.locations?.color) return item.locations.color;
  return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
}

export function ItemsGrid({ items: initialItems, locations }: ItemsGridProps) {
  const [search,    setSearch]    = useState("");
  const [filterLoc, setFilterLoc] = useState("");
  const [items,     setItems]     = useState(initialItems);
  const [deleting,  setDeleting]  = useState<string | null>(null);
  const router = useRouter();

  const filtered = useMemo(() =>
    items.filter((item) => {
      const matchSearch = !search ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.description ?? "").toLowerCase().includes(search.toLowerCase());
      const matchLoc = !filterLoc || item.location_id === filterLoc;
      return matchSearch && matchLoc;
    }),
    [items, search, filterLoc]
  );

  async function handleDelete(e: React.MouseEvent, item: Item) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`"${item.name}" wirklich löschen?`)) return;
    setDeleting(item.id);
    try {
      const supabase = createBrowserClient();
      await supabase.from("items").update({ deleted_at: new Date().toISOString() }).eq("id", item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      router.refresh();
    } finally {
      setDeleting(null);
    }
  }

  function handleEdit(e: React.MouseEvent, itemId: string) {
    e.preventDefault();
    e.stopPropagation();
    router.push(ROUTES.itemEdit(itemId));
  }

  return (
    <div className="space-y-4">
      {/* Suchleiste + Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
            <LucideIcons.Search className="h-4 w-4" />
          </div>
          <input
            type="search"
            placeholder="Nach Name, Tags oder Beschreibung suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 rounded-xl pl-10 pr-4 text-sm bg-[#1a2535] border border-slate-700 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
            <LucideIcons.Filter className="h-4 w-4" />
          </div>
          <select
            value={filterLoc}
            onChange={(e) => setFilterLoc(e.target.value)}
            className="h-10 pl-9 pr-8 rounded-xl text-sm bg-[#1a2535] border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 appearance-none min-w-[160px]"
          >
            <option value="">Alle Ablageorte</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
            <LucideIcons.ChevronDown className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Kacheln */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-700" style={{ backgroundColor: "#1a2535" }}>
          <EmptyState
            icon={<LucideIcons.Package />}
            title={search || filterLoc ? "Keine Ergebnisse" : "Noch keine Gegenstände"}
            description={search || filterLoc ? "Versuche andere Suchbegriffe oder Filter." : "Füge deinen ersten Gegenstand hinzu."}
            action={
              !search && !filterLoc ? (
                <Link href={ROUTES.itemNew}>
                  <Button size="sm">
                    <LucideIcons.Plus className="h-4 w-4" /> Ersten Gegenstand erstellen
                  </Button>
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((item, index) => {
            const color = getItemColor(item, index);
            return (
              <Link key={item.id} href={ROUTES.itemDetail(item.id)}>
                <div className="rounded-2xl overflow-hidden border border-slate-700 hover:border-slate-500 hover:scale-[1.02] transition-all duration-150 cursor-pointer">
                  {/* Farb-Banner */}
                  <div className="h-32 flex items-center justify-center relative" style={{ backgroundColor: color }}>
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <DynIcon name={item.icon} className="h-12 w-12 text-white/80" />
                    )}
                    {item.quantity > 1 && (
                      <div className="absolute top-2 right-2 bg-black/30 backdrop-blur-sm text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                        {item.quantity}×
                      </div>
                    )}
                  </div>

                  {/* Info + Buttons */}
                  <div className="p-3 flex items-center justify-between gap-2" style={{ backgroundColor: "#1e2a3a" }}>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-100 truncate">{item.name}</p>
                      {item.locations && (
                        <div className="flex items-center gap-1 mt-1">
                          <LucideIcons.MapPin className="h-3 w-3 flex-shrink-0" style={{ color: item.locations.color ?? "#6b7280" }} />
                          <span className="text-xs text-slate-500 truncate">{item.locations.name}</span>
                        </div>
                      )}
                    </div>
                    {/* Bearbeiten + Löschen */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => handleEdit(e, item.id)}
                        className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-slate-700 transition-colors"
                        title="Bearbeiten"
                      >
                        <LucideIcons.Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, item)}
                        disabled={deleting === item.id}
                        className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-danger-400 hover:bg-danger-900/30 transition-colors"
                        title="Löschen"
                      >
                        {deleting === item.id
                          ? <LucideIcons.Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <LucideIcons.Trash2 className="h-3.5 w-3.5" />
                        }
                      </button>
                    </div>
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
