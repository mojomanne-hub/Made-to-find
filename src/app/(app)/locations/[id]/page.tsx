import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Edit, Plus } from "lucide-react";
import { createServerClient } from "@/lib/supabase/server";
import { Button }               from "@/components/ui/Button";
import { Badge }                from "@/components/ui/Badge";
import { Card }                 from "@/components/ui/Card";
import { ItemList }             from "@/components/items/ItemList";
import { LocationDeleteButton } from "@/components/locations/LocationDeleteButton";
import { ROUTES }               from "@/lib/constants";
import { formatDateTime }       from "@/lib/utils";
import { MapPin }               from "lucide-react";

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data } = await supabase.from("locations").select("name").eq("id", id).returns<{name:string}[]>().maybeSingle();
  return { title: data?.name ?? "Ablageort" };
}

export default async function LocationDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(ROUTES.login);

  type LocationRow = { id: string; name: string; description: string | null; color: string | null; updated_at: string; deleted_at: string | null; user_id: string; created_at: string };
  type ItemRow     = { id: string; name: string; description: string | null; quantity: number; updated_at: string; location_id: string; user_id: string; created_at: string; deleted_at: string | null };

  const [{ data: location }, { data: items }] = await Promise.all([
    supabase.from("locations").select("*").eq("id", id).is("deleted_at", null).returns<LocationRow[]>().maybeSingle(),
    supabase.from("items").select("*").eq("location_id", id).is("deleted_at", null).returns<ItemRow[]>().order("name"),
  ]);

  if (!location) notFound();

  return (
    <>
      <Link href={ROUTES.locations} className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 mb-5 transition-colors">
        <ChevronLeft className="h-4 w-4" /> Alle Ablageorte
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          {/* Farb-Indikator */}
          <div
            className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
            style={{ backgroundColor: (location.color ?? "#3b82f6") + "20" }}
          >
            <MapPin className="h-5 w-5" style={{ color: location.color ?? "#3b82f6" }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-100">{location.name}</h1>
              <Badge variant="primary">{items?.length ?? 0} Stück</Badge>
            </div>
            {location.description && (
              <p className="text-sm text-slate-400 mt-0.5">{location.description}</p>
            )}
            <p className="text-xs text-slate-500 mt-0.5">
              Zuletzt aktualisiert: {formatDateTime(location.updated_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <LocationDeleteButton locationId={id} locationName={location.name} />
          <Link href={ROUTES.locationEdit(id)}>
            <Button variant="outline" size="sm">
              <Edit className="h-3.5 w-3.5" /> Bearbeiten
            </Button>
          </Link>
        </div>
      </div>

      {/* Gegenstände hinzufügen */}
      <div className="mb-4">
        <Link href={ROUTES.itemNewAtLocation(id)}>
          <Button size="sm" variant="secondary">
            <Plus className="h-4 w-4" /> Gegenstand hinzufügen
          </Button>
        </Link>
      </div>

      <ItemList items={items ?? []} showLocation={false} />
    </>
  );
}
