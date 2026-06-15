import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getActiveGroupId }   from "@/lib/utils/group";
import { PageHeader }         from "@/components/layout/PageHeader";
import { Button }             from "@/components/ui/Button";
import { LocationsGrid }      from "@/components/locations/LocationsGrid";
import { ROUTES }             from "@/lib/constants";

export const metadata: Metadata = { title: "Ablageorte" };

export default async function LocationsPage() {
  const supabase = await createServerClient();
  const groupId  = await getActiveGroupId();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(ROUTES.login);

  let query = supabase
    .from("locations")
    .select("*, items(count)")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (groupId) {
    query = query.eq("group_id", groupId);
  } else {
    query = query.eq("user_id", user.id).is("group_id", null);
  }

  const { data: locations } = await query;

  const newLocationHref = groupId
    ? `${ROUTES.locationNew}?group=${groupId}`
    : ROUTES.locationNew;

  return (
    <>
      <PageHeader
        title="Ablageorte"
        description={groupId ? "Ablageorte der Gruppe" : "Deine persönlichen Ablageorte"}
        action={
          <Link href={newLocationHref}>
            <Button size="sm"><Plus className="h-4 w-4" /> Neuer Ablageort</Button>
          </Link>
        }
      />
      <LocationsGrid locations={(locations ?? []) as Parameters<typeof LocationsGrid>[0]["locations"]} />
    </>
  );
}
