/**
 * /join/[token] – Einladungslink-Handler
 *
 * Eingeloggt   → direkt der Gruppe beitreten → Dashboard
 * Nicht eingeloggt → Login/Register mit redirect zurück zu dieser URL
 */

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

  // Gruppe anhand des Tokens laden (öffentlich lesbar für die Anzeige)
  const { data: group } = await supabase
    .from("groups")
    .select("id, name")
    .eq("invite_token", token)
    .maybeSingle();

  if (!group) {
    // Ungültiger Token → zum Login
    redirect(ROUTES.login);
  }

  const { data: { user } } = await supabase.auth.getUser();

  // Eingeloggt → direkt beitreten (Client Component übernimmt)
  // Nicht eingeloggt → Login mit redirect
  return (
    <JoinGroupClient
      token={token}
      groupName={group.name}
      isLoggedIn={!!user}
    />
  );
}
