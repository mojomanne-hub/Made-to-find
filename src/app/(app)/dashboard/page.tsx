import type { Metadata } from "next";
import { redirect }           from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getActiveGroupId }   from "@/lib/utils/group";
import { DashboardClient }    from "@/components/dashboard/DashboardClient";
import { ROUTES }             from "@/lib/constants";

export const metadata: Metadata = { title: "Übersicht" };

type LocationRow = { id: string; name: string; color: string | null; icon: string | null; image_url: string | null; updated_at: string };
type ItemRow = { id: string; name: string; icon: string | null; image_url: string | null; color: string | null; updated_at: string; locations: { name: string; color: string | null } | null };

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const groupId  = await getActiveGroupId();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(ROUTES.login);

  const [locCount, itemCount, locsResult, itemsResult] = await Promise.all([
    // Location count
    groupId
      ? supabase.from("locations").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("group_id", groupId)
      : supabase.from("locations").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("user_id", user.id).is("group_id", null),
    // Item count
    groupId
      ? supabase.from("items").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("group_id", groupId)
      : supabase.from("items").select("*", { count: "exact", head: true }).is("deleted_at", null).eq("user_id", user.id).is("group_id", null),
    // Recent locations
    groupId
      ? supabase.from("locations").select("id, name, color, icon, image_url, updated_at").is("deleted_at", null).eq("group_id", groupId).order("updated_at", { ascending: false }).limit(6)
      : supabase.from("locations").select("id, name, color, icon, image_url, updated_at").is("deleted_at", null).eq("user_id", user.id).is("group_id", null).order("updated_at", { ascending: false }).limit(6),
    // Recent items
    groupId
      ? supabase.from("items").select("id, name, icon, image_url, color, updated_at, locations(name, color)").is("deleted_at", null).eq("group_id", groupId).order("created_at", { ascending: false }).limit(5)
      : supabase.from("items").select("id, name, icon, image_url, color, updated_at, locations(name, color)").is("deleted_at", null).eq("user_id", user.id).is("group_id", null).order("created_at", { ascending: false }).limit(5),
  ]);

  return (
    <DashboardClient
      locationCount={locCount.count ?? 0}
      itemCount={itemCount.count ?? 0}
      locations={(locsResult.data ?? []) as LocationRow[]}
      recentItems={(itemsResult.data ?? []) as unknown as ItemRow[]}
      groupId={groupId}
    />
  );
}
