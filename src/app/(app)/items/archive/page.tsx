import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getActiveGroupId }   from "@/lib/utils/group";
import { PageHeader }         from "@/components/layout/PageHeader";
import { BarcodeArchive, type ArchiveEntry } from "@/components/scanner/BarcodeArchive";
import { ROUTES }             from "@/lib/constants";

export const metadata: Metadata = { title: "Barcode-Archiv" };

export default async function BarcodeArchivePage() {
  const supabase = await createServerClient();
  const groupId  = await getActiveGroupId();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(ROUTES.login);

  let tplQuery = supabase
    .from("barcode_templates")
    .select("id, barcode, name, description, icon, color, image_url, updated_at")
    .order("name");
  tplQuery = groupId ? tplQuery.eq("group_id", groupId) : tplQuery.eq("user_id", user.id).is("group_id", null);

  let locQuery = supabase.from("locations").select("id, name").is("deleted_at", null).order("name");
  locQuery = groupId ? locQuery.eq("group_id", groupId) : locQuery.eq("user_id", user.id).is("group_id", null);

  // Welche Codes liegen gerade in einem Ablageort? (für den Hinweis „aktuell abgelegt“)
  let itemQuery = supabase.from("items").select("barcode").is("deleted_at", null).not("barcode", "is", null);
  itemQuery = groupId ? itemQuery.eq("group_id", groupId) : itemQuery.eq("user_id", user.id).is("group_id", null);

  const [{ data: templates }, { data: locations }, { data: items }] = await Promise.all([tplQuery, locQuery, itemQuery]);

  const counts: Record<string, number> = {};
  for (const i of items ?? []) if (i.barcode) counts[i.barcode] = (counts[i.barcode] ?? 0) + 1;

  return (
    <>
      <PageHeader
        title="Barcode-Archiv"
        description={groupId ? "Gespeicherte Codes der Gruppe" : "Deine gespeicherten Codes"}
      />
      <BarcodeArchive
        entries={(templates ?? []) as ArchiveEntry[]}
        locations={locations ?? []}
        inUse={counts}
        userId={user.id}
        groupId={groupId ?? null}
      />
    </>
  );
}
