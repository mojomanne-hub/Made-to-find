import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import * as LucideIcons from "lucide-react";
import { createServerClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { Location } from "@/lib/types";

function DynIcon({ name, className }: { name: string; className?: string }) {
  const Icon = (LucideIcons as unknown as Record<string, React.FC<{ className?: string }>>)[name];
  if (!Icon) return <LucideIcons.Box className={className} />;
  return <Icon className={className} />;
}

export const metadata: Metadata = {
  title: "Ablageort",
};

export default async function LocationDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(ROUTES.login);

  const { data: location } = await supabase
    .from("locations")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!location) redirect(ROUTES.locations);

  const locationColor = location.color || "#1a2535";

  return (
    <div className="bg-gradient-to-b from-slate-900 to-slate-950">
      {/* Hero Banner */}
      <div
        className="w-full"
        style={{ backgroundColor: locationColor }}
      >
        {location.image_url ? (
          <img
            src={location.image_url}
            alt={location.name}
            className="w-full rounded-2xl object-contain"
          />
        ) : location.icon ? (
          <div className="w-full flex items-center justify-center py-16 rounded-2xl">
            {location.icon.length <= 4 && !/^[A-Z]/.test(location.icon) ? (
              <span className="text-9xl">{location.icon}</span>
            ) : (
              <DynIcon name={location.icon} className="h-32 w-32 text-white" />
            )}
          </div>
        ) : null}
      </div>

      {/* Content */}
      <div className="px-4 py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">{location.name}</h1>
        </div>

        {location.description && (
          <div>
            <p className="text-sm font-medium text-slate-300 mb-2">Beschreibung</p>
            <p className="text-slate-400 whitespace-pre-wrap">{location.description}</p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button variant="secondary" asChild>
            <Link href={ROUTES.locationEdit(location.id)}>
              <LucideIcons.Edit2 className="h-4 w-4 mr-1.5" />
              Bearbeiten
            </Link>
          </Button>
          <Button variant="danger" asChild>
            <Link href={ROUTES.locationDelete(location.id)}>
              <LucideIcons.Trash2 className="h-4 w-4 mr-1.5" />
              Löschen
            </Link>
          </Button>
        </div>

        <Link href={ROUTES.locations} className="inline-flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 transition-colors mt-6">
          <LucideIcons.ChevronLeft className="h-4 w-4" />
          Zurück zur Übersicht
        </Link>
      </div>
    </div>
  );
}
