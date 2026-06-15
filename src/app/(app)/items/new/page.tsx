import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getActiveGroupId }   from "@/lib/utils/group";
import { PageHeader } from "@/components/layout/PageHeader";
import { ItemForm }   from "@/components/items/ItemForm";
import { ROUTES }     from "@/lib/constants";

export const metadata: Metadata = { title: "Neuer Gegenstand" };

interface Props { searchParams: Promise<{ location?: string }> }

export default async function NewItemPage({ searchParams }: Props) {
  const { location: preselectedLocationId } = await searchParams;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(ROUTES.login);

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
          preselectedLocationId={preselectedLocationId}
          userId={user.id}
          groupId={groupId}
        />
      </div>
    </>
  );
}
