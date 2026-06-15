import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { PageHeader }   from "@/components/layout/PageHeader";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { ROUTES }       from "@/lib/constants";

export const metadata: Metadata = { title: "Einstellungen" };

export default async function SettingsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(ROUTES.login);

  // Profil laden
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <>
      <PageHeader title="Einstellungen" description="Konto verwalten" />
      <div className="max-w-lg space-y-4">
        <SettingsForm
          userEmail={user.email ?? ""}
          displayName={profile?.display_name ?? ""}
        />
      </div>
    </>
  );
}
