import { redirect } from "next/navigation";
import { cookies }  from "next/headers";
import { createServerClient }  from "@/lib/supabase/server";
import { GroupProvider }       from "@/lib/context/GroupContext";
import { Sidebar }             from "@/components/layout/Sidebar";
import { BottomNav }           from "@/components/layout/BottomNav";
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

  // Alle Gruppen des Benutzers laden
  const { data: memberships } = await supabase
    .from("group_members")
    .select("groups(id, name, invite_token, created_by)")
    .eq("user_id", user.id)
    .returns<{ groups: { id: string; name: string; invite_token: string; created_by: string } | null }[]>();

  const userGroups = (memberships ?? [])
    .map((m) => m.groups)
    .filter((g): g is { id: string; name: string; invite_token: string; created_by: string } => g !== null);

  // Aktiven Gruppen-Cookie lesen
  const cookieStore = await cookies();
  const activeGroupId = cookieStore.get("active-group")?.value ?? null;

  // Validieren: Gruppe muss dem User gehören
  const validGroupId = activeGroupId && userGroups.find((g) => g.id === activeGroupId)
    ? activeGroupId
    : null;

  return (
    <GroupProvider initialGroupId={validGroupId} initialGroups={userGroups}>
      <div className="min-h-screen flex" style={{ backgroundColor: "#111827" }}>
        <Sidebar user={user} groups={userGroups} displayName={profile?.display_name ?? ""} />
        <main className="flex-1 min-w-0 pb-20 lg:pb-0">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
        <BottomNav />
      </div>
    </GroupProvider>
  );
}
