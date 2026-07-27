import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { JoinGroupClient } from "@/components/groups/JoinGroupClient";
import { ROUTES } from "@/lib/constants";

interface Props {
  params: Promise<{ token: string }>;
}

export const metadata: Metadata = { title: "Gruppe beitreten" };

export default async function JoinGroupPage({ params }: Props) {
  const { token } = await params;
  const supabase  = await createServerClient();

  const { data: group } = await supabase
    .from("groups")
    .select("id, name")
    .eq("invite_token", token)
    .maybeSingle();

  if (!group) {
    redirect(ROUTES.login);
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Nicht eingeloggt → Login mit redirect zurück zu dieser Seite
    redirect(`${ROUTES.login}?redirect=/join/${token}`);
  }

  return (
    <JoinGroupClient
      token={token}
      groupName={group.name}
      isLoggedIn={true}
    />
  );
}
