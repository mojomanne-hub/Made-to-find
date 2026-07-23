import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Edit, MapPin } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { createServerClient } from "@/lib/supabase/server";
import { Badge }            from "@/components/ui/Badge";
import { Card }             from "@/components/ui/Card";
import { ItemDeleteButton } from "@/components/items/ItemDeleteButton";
import { ROUTES }           from "@/lib/constants";

interface Props { params: Promise<{ id: string }> }

function DynIcon({ name, className }: { name: string | null; className?: string }) {
  const Icon = name
    ? (LucideIcons as unknown as Record<string, React.FC<{ className?: string }>>)[name]
    : null;
  const Comp = Icon ?? LucideIcons.Box;
  return <Comp className={className} />;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data } = await supabase.from("items").select("name").eq("id", id).returns<{ name: string }[]>().maybeSingle();
  return { title: data?.name ?? "Gegenstand" };
}

export default async function ItemDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(ROUTES.login);

  type ItemRow = {
    id: string; name: string; description: string | null;
    quantity: number; updated_at: string; location_id: string;
    image_url: string | null; icon: string | null; color: string | null;
    locations: { id: string; name: string; color: string | null } | null;
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
  const color    = item.color ?? location?.color ?? "#6b7280";

  return (
    <>
      {/* Zurück */}
      <Link
        href={ROUTES.items}
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 mb-4 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" /> Alle Gegenstände
      </Link>

      {/* Hero Banner – 16:9 */}
      <div
        className="rounded-2xl overflow-hidden mb-5 w-full"
        style={{ backgroundColor: color, maxHeight: "280px", aspectRatio: "16/9" }}
      >
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <DynIcon name={item.icon} className="h-20 w-20 text-white/70" />
          </div>
        )}
      </div>

      {/* Name + Aktionen */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{item.name}</h1>
          {location && (
            <Link
              href={ROUTES.locationDetail(location.id)}
              className="flex items-center gap-1 mt-1 text-sm text-brand-400 hover:text-brand-300 transition-colors"
            >
              <MapPin className="h-3.5 w-3.5" style={{ color: location.color ?? "#3b82f6" }} />
              {location.name}
            </Link>
          )}
          <div className="mt-2">
            <Badge variant={item.quantity === 0 ? "danger" : "default"}>
              {item.quantity}×
            </Badge>
          </div>
        </div>

        {/* Icon-Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <ItemDeleteButton itemId={id} itemName={item.name} />
          <Link href={ROUTES.itemEdit(id)}>
            <button className="h-9 w-9 rounded-xl border border-slate-600 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-all">
              <Edit className="h-4 w-4" />
            </button>
          </Link>
        </div>
      </div>

      {/* Beschreibung */}
      {item.description && (
        <div className="max-w-lg">
          <Card padding="sm">
            <p className="text-xs text-slate-500 mb-1.5">Beschreibung</p>
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{item.description}</p>
          </Card>
        </div>
      )}
    </>
  );
}
