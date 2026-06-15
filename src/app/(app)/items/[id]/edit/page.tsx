import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { ItemForm }   from "@/components/items/ItemForm";
import { ROUTES }     from "@/lib/constants";

interface Props { params: Promise<{ id: string }> }
export const metadata: Metadata = { title: "Gegenstand bearbeiten" };

export default async function EditItemPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(ROUTES.login);

  const [{ data: item }, { data: locations }] = await Promise.all([
    supabase.from("items").select("*").eq("id", id).is("deleted_at", null).maybeSingle(),
    supabase.from("locations").select("id, name, color").is("deleted_at", null).order("name"),
  ]);

  if (!item) notFound();
  const groupId = (item as { group_id?: string | null }).group_id ?? null;

  return (
    <>
      <Link
        href={ROUTES.itemDetail(id)}
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 mb-5 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" /> Zurück
      </Link>
      <PageHeader title="Gegenstand bearbeiten" />
      <div className="max-w-lg">
        <ItemForm
          item={item}
          locations={locations ?? []}
          userId={user.id}
          groupId={groupId}
        />
      </div>
    </>
  );
}
