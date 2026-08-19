import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Edit, Plus } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { createServerClient }   from "@/lib/supabase/server";
import { Badge }                from "@/components/ui/Badge";
import { ItemList }             from "@/components/items/ItemList";
import { LocationDeleteButton } from "@/components/locations/LocationDeleteButton";
import { ROUTES }               from "@/lib/constants";
import { Button }               from "@/components/ui/Button";

interface Props { params: Promise<{ id: string }> }

function DynIcon({ name, className }: { name: string | null; className?: string }) {
  if (!name) return <LucideIcons.MapPin className={className} />;
  
  // Emoji-Erkennung: max 4 Zeichen und nicht mit Großbuchstaben (Lucide-Icon-Namen)
  const isEmoji = name.length <= 4 && !/^[A-Z]/.test(name);
  
  if (isEmoji) {
    return <span className="text-9xl leading-none">{name}</span>;
  }
  
  const Icon = (LucideIcons as unknown as Record<string, React.FC<{ className?: string }>>)[name];
  const Comp = Icon ?? LucideIcons.MapPin;
  return <Comp className={className} />;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data } = await supabase.from("locations").select("name").eq("id", id).returns<{ name: string }[]>().maybeSingle();
  return { title: data?.name ?? "Ablageort" };
}

export default async function LocationDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(ROUTES.login);

  type LocationRow = {
    id: string; name: string; description: string | null;
    color: string | null; icon: string | null; image_url: string | null;
    updated_at: string; deleted_at: string | null; user_id: string; created_at: string;
  };
  type ItemRow = {
    id: string; name: string; description: string | null; quantity: number;
    updated_at: string; location_id: string; user_id: string;
    created_at: string; deleted_at: string | null;
    icon: string | null; image_url: string | null; color: string | null;
    shelf_id: string | null;
  };
  type ShelfRow = { id: string; name: string; position: number };

  const [{ data: location }, { data: items }, { data: shelfList }] = await Promise.all([
    supabase.from("locations").select("*").eq("id", id).is("deleted_at", null).returns<LocationRow[]>().maybeSingle(),
    supabase.from("items").select("*").eq("location_id", id).is("deleted_at", null).returns<ItemRow[]>().order("name"),
    supabase.from("shelves").select("id, name, position").eq("location_id", id).order("position").returns<ShelfRow[]>(),
  ]);

  if (!location) notFound();

  const color = location.color ?? "#3b82f6";
  const allItems = items ?? [];
  const shelves = shelfList ?? [];
  const hasShelves = shelves.length > 0;

  // Items nach Fach gruppieren (nur relevant, wenn der Ablageort Fächer hat)
  const itemsByShelf = hasShelves
    ? shelves.map((shelf) => ({
        shelf,
        items: allItems.filter((it) => it.shelf_id === shelf.id),
      }))
    : [];
  const itemsWithoutShelf = hasShelves
    ? allItems.filter((it) => !it.shelf_id)
    : [];

  return (
    <>
      {/* Zurück */}
      <Link
        href={ROUTES.locations}
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 mb-4 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" /> Alle Ablageorte
      </Link>

      {/* Hero Banner */}
      <div
        className="rounded-2xl overflow-hidden mb-5 w-full"
        style={{ backgroundColor: color }}
      >
        {location.image_url ? (
          <img
            src={location.image_url}
            alt={location.name}
            className="w-full rounded-2xl object-contain"
          />
        ) : location.icon ? (
          <div className="w-full flex items-center justify-center py-12 rounded-2xl" style={{ backgroundColor: location.color || "#1a2535" }}>
            <DynIcon name={location.icon} className="h-32 w-32 text-white" />
          </div>
        ) : null}
      </div>

      {/* Name + Aktionen */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{location.name}</h1>
          {location.description && (
            <p className="text-sm text-slate-400 mt-1">{location.description}</p>
          )}
          <div className="mt-2">
            <Badge variant="primary">{allItems.length} Artikel</Badge>
          </div>
        </div>

        {/* Icon-Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <LocationDeleteButton locationId={id} locationName={location.name} />
          <Link href={ROUTES.locationEdit(id)}>
            <button className="h-9 w-9 rounded-xl border border-slate-600 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-all">
              <Edit className="h-4 w-4" />
            </button>
          </Link>
        </div>
      </div>

      {/* Gegenstand hinzufügen */}
      <div className="mb-4">
        <Link href={ROUTES.itemNewAtLocation(id)}>
          <Button size="sm" variant="secondary">
            <Plus className="h-4 w-4" /> Gegenstand hinzufügen
          </Button>
        </Link>
      </div>

      {/* Gegenstände-Liste */}
      {hasShelves ? (
        <div className="space-y-6">
          {itemsByShelf.map(({ shelf, items: shelfItems }) => (
            <div key={shelf.id}>
              <div className="flex items-center gap-2 mb-2">
                <LucideIcons.Rows3 className="h-3.5 w-3.5 text-slate-500" />
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{shelf.name}</h2>
                <span className="text-xs text-slate-600">({shelfItems.length})</span>
              </div>
              {shelfItems.length > 0 ? (
                <ItemList items={shelfItems} showLocation={false} />
              ) : (
                <p className="text-xs text-slate-600 pl-1">Keine Gegenstände in diesem Fach.</p>
              )}
            </div>
          ))}

          {itemsWithoutShelf.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <LucideIcons.HelpCircle className="h-3.5 w-3.5 text-slate-500" />
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Ohne Fach</h2>
                <span className="text-xs text-slate-600">({itemsWithoutShelf.length})</span>
              </div>
              <ItemList items={itemsWithoutShelf} showLocation={false} />
            </div>
          )}
        </div>
      ) : (
        <ItemList items={allItems} showLocation={false} />
      )}
    </>
  );
}
