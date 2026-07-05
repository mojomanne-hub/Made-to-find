import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Edit, Plus } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { createServerClient }   from "@/lib/supabase/server";
import { Button }               from "@/components/ui/Button";
import { Badge }                from "@/components/ui/Badge";
import { ItemList }             from "@/components/items/ItemList";
import { LocationDeleteButton } from "@/components/locations/LocationDeleteButton";
import { ROUTES }               from "@/lib/constants";

interface Props { params: Promise<{ id: string }> }

function DynIcon({ name, className }: { name: string | null; className?: string }) {
  const Icon = name
    ? (LucideIcons as unknown as Record<string, React.FC<{ className?: string }>>)[name]
    : null;
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
  };

  const [{ data: location }, { data: items }] = await Promise.all([
    supabase.from("locations").select("*").eq("id", id).is("deleted_at", null).returns<LocationRow[]>().maybeSingle(),
    supabase.from("items").select("*").eq("location_id", id).is("deleted_at", null).returns<ItemRow[]>().order("name"),
  ]);

  if (!location) notFound();

  const color = location.color ?? "#3b82f6";

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
      <div className="rounded-2xl overflow-hidden mb-5" style={{ backgroundColor: color }}>
        {location.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={location.image_url} alt={location.name} className="w-full h-36 object-cover" />
        ) : (
          <div className="h-36 flex items-center justify-center">
            <DynIcon name={location.icon} className="h-16 w-16 text-white/70" />
          </div>
        )}
      </div>

      {/* Name + Aktionen */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{location.name}</h1>
          {location.description && (
            <p className="text-sm text-slate-400 mt-1">{location.description}</p>
          )}
          <div className="mt-2">
            <Badge variant="primary">{items?.length ?? 0} Artikel</Badge>
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
      <ItemList items={items ?? []} showLocation={false} />
    </>
  );
}
