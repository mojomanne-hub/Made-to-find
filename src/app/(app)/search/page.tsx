import type { Metadata } from "next";
import { redirect }           from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getActiveGroupId }   from "@/lib/utils/group";
import { PageHeader }         from "@/components/layout/PageHeader";
import { SearchInterface }    from "@/components/search/SearchInterface";
import { ROUTES }             from "@/lib/constants";

export const metadata: Metadata = { title: "Suche" };

export default async function SearchPage() {
  const supabase = await createServerClient();
  const groupId  = await getActiveGroupId();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(ROUTES.login);

  return (
    <>
      <PageHeader
        title="Suche"
        description={groupId ? "Suche in der Gruppe" : "Suche in deinen Daten"}
      />
      <SearchInterface userId={user.id} groupId={groupId} />
    </>
  );
}
