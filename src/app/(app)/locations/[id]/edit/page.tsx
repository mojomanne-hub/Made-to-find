import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createServerClient } from "@/lib/supabase/server";
import { PageHeader }   from "@/components/layout/PageHeader";
import { LocationForm } from "@/components/locations/LocationForm";
import { ROUTES }       from "@/lib/constants";

interface Props { params: Promise<{ id: string }> }
export const metadata: Metadata = { title: "Ablageort bearbeiten" };

export default async function EditLocationPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(ROUTES.login);

  const { data: location } = await supabase
    .from("locations").select("*").eq("id", id).is("deleted_at", null).maybeSingle();

  if (!location) notFound();
  const groupId = (location as { group_id?: string | null }).group_id ?? null;

  return (
    <>
      <Link
        href={ROUTES.locationDetail(id)}
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 mb-5 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" /> Zurück
      </Link>
      <PageHeader title="Ablageort bearbeiten" />
      <div className="max-w-lg">
        <LocationForm location={location} userId={user.id} groupId={groupId} />
      </div>
    </>
  );
}
