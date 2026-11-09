import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getActiveGroupId }   from "@/lib/utils/group";
import { PageHeader } from "@/components/layout/PageHeader";
import { ItemForm }   from "@/components/items/ItemForm";
import { ROUTES }     from "@/lib/constants";
import { lookupBarcode } from "@/lib/utils/barcode-lookup";
export const metadata: Metadata = { title: "Neuer Gegenstand" };
interface Props { searchParams: Promise<{ location?: string; barcode?: string }> }
export default async function NewItemPage({ searchParams }: Props) {
  const { location: preselectedLocationId, barcode } = await searchParams;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(ROUTES.login);
  // Produktdaten zum Strichcode (falls bekannt) vorab holen
  // groupId direkt aus Cookie lesen
  const groupId = await getActiveGroupId();
  // Ablageorte passend zum Kontext laden
  let locQuery = supabase
    .from("locations")
    .select("id, name, color")
    .is("deleted_at", null)
    .order("name");
  if (groupId) {
    locQuery = locQuery.eq("group_id", groupId);
  } else {
    locQuery = locQuery.eq("user_id", user.id).is("group_id", null);
  }
  const { data: locations } = await locQuery;

  // 1) eigenes Archiv (früher angelegter, inzwischen gelöschter Gegenstand), 2) offene Produktdatenbanken
  let tpl: { name: string; description: string | null; icon: string | null; color: string | null; image_url: string | null } | null = null;
  if (barcode) {
    const variants = [barcode];
    if (/^\d{12}$/.test(barcode)) variants.push("0" + barcode);
    if (/^0\d{12}$/.test(barcode)) variants.push(barcode.slice(1));
    let tq = supabase.from("barcode_templates").select("name, description, icon, color, image_url").in("barcode", variants).limit(1);
    tq = groupId ? tq.eq("group_id", groupId) : tq.eq("user_id", user.id).is("group_id", null);
    const { data: t } = await tq;
    tpl = (t ?? [])[0] ?? null;
  }
  const product = !tpl && barcode ? await lookupBarcode(barcode) : null;

  const locationIds = (locations ?? []).map((l) => l.id);
  const { data: shelves } = locationIds.length > 0
    ? await supabase
        .from("shelves")
        .select("id, location_id, name")
        .in("location_id", locationIds)
        .order("position")
    : { data: [] as { id: string; location_id: string; name: string }[] };

  const backHref = preselectedLocationId
    ? ROUTES.locationDetail(preselectedLocationId)
    : ROUTES.items;
  return (
    <>
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 mb-5 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" /> Zurück
      </Link>
      <PageHeader
        title="Neuer Gegenstand"
        description={groupId ? "Wird zur Gruppe hinzugefügt" : "Persönlicher Gegenstand"}
      />
      <div className="max-w-lg">
        <ItemForm
          locations={locations ?? []}
          shelves={shelves ?? []}
          preselectedLocationId={preselectedLocationId}
          initialBarcode={barcode ? barcode.slice(0, 64) : undefined}
          initialName={tpl?.name ?? product?.name}
          initialDescription={tpl?.description ?? product?.description ?? undefined}
          initialIcon={tpl?.icon ?? undefined}
          initialColor={tpl?.color ?? undefined}
          initialImageUrl={tpl?.image_url ?? product?.imageUrl ?? undefined}
          imageIsExternal={!tpl && !!product?.imageUrl}
          productSource={tpl ? "Archiv" : product?.source}
          userId={user.id}
          groupId={groupId}
        />
      </div>
    </>
  );
}
