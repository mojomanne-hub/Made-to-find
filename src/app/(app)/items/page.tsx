import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getActiveGroupId }   from "@/lib/utils/group";
import { PageHeader }         from "@/components/layout/PageHeader";
import { Button }             from "@/components/ui/Button";
import { ItemsGrid }          from "@/components/items/ItemsGrid";
import { ROUTES }             from "@/lib/constants";

export const metadata: Metadata = { title: "Gegenstände" };

export default async function ItemsPage() {
  const supabase = await createServerClient();
  const groupId  = await getActiveGroupId();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(ROUTES.login);

  // Items
  let itemQuery = supabase
    .from("items")
    .select("*, locations(id, name, color)")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (groupId) {
    itemQuery = itemQuery.eq("group_id", groupId);
  } else {
    itemQuery = itemQuery.eq("user_id", user.id).is("group_id", null);
  }

  // Ablageorte für Filter-Dropdown (nur passende)
  let locQuery = supabase
    .from("locations")
    .select("id, name")
    .is("deleted_at", null)
    .order("name");

  if (groupId) {
    locQuery = locQuery.eq("group_id", groupId);
  } else {
    locQuery = locQuery.eq("user_id", user.id).is("group_id", null);
  }

  const [{ data: items }, { data: locations }] = await Promise.all([itemQuery, locQuery]);

  const newItemHref = groupId
    ? `${ROUTES.itemNew}?group=${groupId}`
    : ROUTES.itemNew;

  return (
    <>
      <PageHeader
        title="Gegenstände"
        description={groupId ? "Gegenstände der Gruppe" : "Deine persönlichen Gegenstände"}
        action={
          <Link href={newItemHref}>
            <Button size="sm"><Plus className="h-4 w-4" /> Neuer Gegenstand</Button>
          </Link>
        }
      />
      <ItemsGrid
        items={(items ?? []) as Parameters<typeof ItemsGrid>[0]["items"]}
        locations={locations ?? []}
      />
    </>
  );
}
