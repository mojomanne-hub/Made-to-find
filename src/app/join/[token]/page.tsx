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

  // Gruppenname zum Einladungscode über eine Datenbank-Funktion holen, die NUR diesen einen
  // Namen zurückgibt (die Gruppen-Tabelle selbst ist für Nicht-Mitglieder nicht mehr lesbar).
  let group: { id: string; name: string } | null = null;
  if (/^[A-Za-z0-9_-]{4,200}$/.test(token)) {
    const { data, error } = await supabase.rpc("group_by_invite_token", { p_token: token });
    if (!error) {
      group = (Array.isArray(data) ? data[0] : data) ?? null;
    } else {
      // Übergang, solange die Funktion noch nicht angelegt ist
      const { data: fallback } = await supabase
        .from("groups").select("id, name").eq("invite_token", token).maybeSingle();
      group = fallback ?? null;
    }
  }

  if (!group) redirect(ROUTES.login);

  const { data: { user } } = await supabase.auth.getUser();

  return (
    <JoinGroupClient
      token={token}
      groupName={group.name}
      isLoggedIn={!!user}
    />
  );
}
