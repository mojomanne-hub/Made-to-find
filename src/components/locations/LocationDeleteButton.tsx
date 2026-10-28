"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { Button }        from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { ROUTES }        from "@/lib/constants";
import { removeStorageImages } from "@/lib/utils/storage";

interface Props {
  locationId:   string;
  locationName: string;
}

export function LocationDeleteButton({ locationId, locationName }: Props) {
  const [isOpen,    setIsOpen]    = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setIsLoading(true);
    try {
      const supabase = createBrowserClient();

      // Foto-URLs merken, bevor Ablageort und Gegenstände verschwinden
      const [{ data: loc }, { data: itemRows }] = await Promise.all([
        supabase.from("locations").select("image_url").eq("id", locationId).maybeSingle(),
        supabase.from("items").select("image_url").eq("location_id", locationId),
      ]);

      // Löscht auch alle Items via CASCADE in der DB
      const { error } = await supabase
        .from("locations")
        .delete()
        .eq("id", locationId);
      if (error) throw error;

      // Erst nach erfolgreichem Löschen auch die Bilddateien entfernen
      await Promise.all([
        removeStorageImages(supabase, "location-images", [loc?.image_url]),
        removeStorageImages(supabase, "item-images", (itemRows ?? []).map((r) => r.image_url)),
      ]);
      router.push(ROUTES.locations);
      router.refresh();
    } catch {
      setIsLoading(false);
      setIsOpen(false);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="text-neutral-400 hover:text-danger-500 hover:bg-danger-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
      <ConfirmDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={handleDelete}
        title="Ablageort löschen"
        message={`Möchtest du „${locationName}" wirklich löschen? Alle darin enthaltenen Gegenstände werden ebenfalls gelöscht.`}
        isLoading={isLoading}
      />
    </>
  );
}
