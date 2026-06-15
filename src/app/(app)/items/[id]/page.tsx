import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Edit, MapPin, Hash } from "lucide-react";
import { createServerClient }  from "@/lib/supabase/server";
import { Button }              from "@/components/ui/Button";
import { Card }                from "@/components/ui/Card";
import { Badge }               from "@/components/ui/Badge";
import { ItemDeleteButton }    from "@/components/items/ItemDeleteButton";
import { ROUTES }              from "@/lib/constants";
import { formatDateTime }      from "@/lib/utils";

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("items")
    .select("name")
    .eq("id", id)
    .returns<{ name: string }[]>()
    .maybeSingle();
  return { title: data?.name ?? "Gegenstand" };
}

export default async function ItemDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(ROUTES.login);

  type ItemRow = {
    id:          string;
    name:        string;
    description: string | null;
    quantity:    number;
    updated_at:  string;
    location_id: string;
    image_url:   string | null;
    locations:   { id: string; name: string; color: string | null } | null;
  };

  const { data: item } = await supabase
    .from("items")
    .select("*, locations(id, name, color)")
    .eq("id", id)
    .is("deleted_at", null)
    .returns<ItemRow[]>()
    .maybeSingle();

  if (!item) notFound();

  const location = item.locations;

  return (
    <>
      <Link
        href={ROUTES.items}
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 mb-5 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" /> Alle Gegenstände
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100">{item.name}</h1>
          <p className="text-xs text-slate-500 mt-1">
            Zuletzt aktualisiert: {formatDateTime(item.updated_at)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <ItemDeleteButton itemId={id} itemName={item.name} />
          <Link href={ROUTES.itemEdit(id)}>
            <Button variant="outline" size="sm">
              <Edit className="h-3.5 w-3.5" /> Bearbeiten
            </Button>
          </Link>
        </div>
      </div>

      <div className="space-y-3 max-w-lg">
        {/* Foto */}
        {item.image_url && (
          <div className="rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-50">
            <div className="relative aspect-video w-full">
              <Image
                src={item.image_url}
                alt={`Foto von ${item.name}`}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          </div>
        )}

        {/* Ablageort */}
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: (location?.color ?? "#3b82f6") + "20" }}
            >
              <MapPin
                className="h-4 w-4"
                style={{ color: location?.color ?? "#3b82f6" }}
              />
            </div>
            <div>
              <p className="text-xs text-slate-400">Ablageort</p>
              {location ? (
                <Link
                  href={ROUTES.locationDetail(location.id)}
                  className="text-sm font-semibold text-brand-600 hover:text-brand-700"
                >
                  {location.name}
                </Link>
              ) : (
                <p className="text-sm text-slate-500">Nicht zugewiesen</p>
              )}
            </div>
          </div>
        </Card>

        {/* Menge */}
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-400">
              <Hash className="h-4 w-4" />
              <span className="text-sm">Menge</span>
            </div>
            <Badge variant={item.quantity === 0 ? "danger" : "default"}>
              {item.quantity} Stück
            </Badge>
          </div>
        </Card>

        {/* Beschreibung */}
        {item.description && (
          <Card padding="sm">
            <p className="text-xs text-slate-400 mb-1.5">Beschreibung</p>
            <p className="text-sm text-slate-300 whitespace-pre-wrap">
              {item.description}
            </p>
          </Card>
        )}
      </div>
    </>
  );
}
