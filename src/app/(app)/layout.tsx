/**
 * App-Layout – Desktop Sidebar + Mobile Drawer + Header
 */

import { redirect } from "next/navigation";
import { cookies }  from "next/headers";
import { createServerClient }  from "@/lib/supabase/server";
import { GroupProvider }       from "@/lib/context/GroupContext";
import { Sidebar }             from "@/components/layout/Sidebar";
import { BottomNav }           from "@/components/layout/BottomNav";
import { MobileLayoutWrapper } from "@/components/layout/MobileLayoutWrapper";
import { ROUTES }              from "@/lib/constants";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(ROUTES.login);

  // Profil + Gruppen laden
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const { data: memberships } = await supabase
    .from("group_members")
    .select("groups(id, name, invite_token, created_by)")
    .eq("user_id", user.id)
    .returns<{ groups: { id: string; name: string; invite_token: string; created_by: string } | null }[]>();

  const userGroups = (memberships ?? [])
    .map((m) => m.groups)
    .filter((g): g is { id: string; name: string; invite_token: string; created_by: string } => g !== null);

  const cookieStore  = await cookies();
  const activeGroupId = cookieStore.get("active-group")?.value ?? null;
  const validGroupId  = activeGroupId && userGroups.find((g) => g.id === activeGroupId)
    ? activeGroupId : null;

  const displayName = profile?.display_name ?? "";

  return (
    <GroupProvider initialGroupId={validGroupId} initialGroups={userGroups}>
      <div className="min-h-screen flex" style={{ backgroundColor: "#111827" }}>

        {/* Desktop Sidebar */}
        <Sidebar user={user} groups={userGroups} displayName={displayName} />

        {/* Mobile: Header + Drawer */}
        <MobileLayoutWrapper
          user={user}
          groups={userGroups}
          displayName={displayName}
        />

        {/* Hauptinhalt */}
        <main className="flex-1 min-w-0 pb-20 lg:pb-0 pt-14 lg:pt-0">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Nav */}
        <BottomNav />
      </div>
    </GroupProvider>
  );
}
