import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import * as LucideIcons from "lucide-react";
import { createServerClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { cn } from "@/lib/utils";
import type { Item } from "@/lib/types";

function DynIcon({ name, className }: { name: string; className?: string }) {
  const Icon = (LucideIcons as unknown as Record<string, React.FC<{ className?: string }>>)[name];
  if (!Icon) return <LucideIcons.Box className={className} />;
  return <Icon className={className} />;
}

export const metadata: Metadata = {
  title: "Gegenstand",
};

export default async function ItemDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(ROUTES.login);

  const { data: item } = await supabase
    .from("items")
    .select("*, locations!inner(name, color)")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!item) redirect(ROUTES.items);

  const location = item.locations as unknown as { name: string; color: string };
  const itemColor = item.color || location?.color || "#1a2535";

  return (
    <div className="bg-gradient-to-b from-slate-900 to-slate-950">
      {/* Hero Banner */}
      <div
        className="w-full"
        style={{ backgroundColor: itemColor }}
      >
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full rounded-2xl object-contain"
          />
        ) : item.icon ? (
          <div className="w-full flex items-center justify-center py-16 rounded-2xl">
            {item.icon.length <= 4 && !/^[A-Z]/.test(item.icon) ? (
              <span className="text-9xl">{item.icon}</span>
            ) : (
              <DynIcon name={item.icon} className="h-32 w-32 text-white" />
            )}
          </div>
        ) : null}
      </div>

      {/* Content */}
      <div className="px-4 py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">{item.name}</h1>
          <p className="text-sm text-slate-400 mt-1 flex items-center gap-1.5">
            <LucideIcons.MapPin className="h-4 w-4 text-brand-400" />
            {location?.name}
          </p>
        </div>

        {item.description && (
          <div>
            <p className="text-sm font-medium text-slate-300 mb-2">Beschreibung</p>
            <p className="text-slate-400 whitespace-pre-wrap">{item.description}</p>
          </div>
        )}

        {item.quantity && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-300">Menge:</span>
            <span className="inline-flex items-center justify-center h-8 px-3 rounded-lg bg-slate-700 text-slate-200 font-semibold">
              {item.quantity}×
            </span>
          </div>
        )}

        {item.expires_at && (
          <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
            <p className="text-xs font-medium text-yellow-600">
              <LucideIcons.AlertCircle className="inline h-4 w-4 mr-1" />
              Läuft ab: {new Date(item.expires_at).toLocaleDateString("de-DE")}
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button variant="secondary" asChild>
            <Link href={ROUTES.itemEdit(item.id)}>
              <LucideIcons.Edit2 className="h-4 w-4 mr-1.5" />
              Bearbeiten
            </Link>
          </Button>
          <Button variant="danger" asChild>
            <Link href={ROUTES.itemDelete(item.id)}>
              <LucideIcons.Trash2 className="h-4 w-4 mr-1.5" />
              Löschen
            </Link>
          </Button>
        </div>

        <Link href={ROUTES.items} className="inline-flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 transition-colors mt-6">
          <LucideIcons.ChevronLeft className="h-4 w-4" />
          Zurück zur Übersicht
        </Link>
      </div>
    </div>
  );
}
