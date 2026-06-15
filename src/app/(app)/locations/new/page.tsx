import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getActiveGroupId }   from "@/lib/utils/group";
import { PageHeader }   from "@/components/layout/PageHeader";
import { LocationForm } from "@/components/locations/LocationForm";
import { ROUTES }       from "@/lib/constants";

export const metadata: Metadata = { title: "Neuer Ablageort" };

export default async function NewLocationPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(ROUTES.login);

  // groupId direkt aus Cookie lesen – zuverlässiger als URL-Parameter
  const groupId = await getActiveGroupId();

  return (
    <>
      <Link
        href={ROUTES.locations}
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 mb-5 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" /> Zurück
      </Link>
      <PageHeader
        title="Neuer Ablageort"
        description={groupId ? "Wird zur Gruppe hinzugefügt" : "Persönlicher Ablageort"}
      />
      <div className="max-w-lg">
        <LocationForm userId={user.id} groupId={groupId} />
      </div>
    </>
  );
}
