"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { Button }        from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { ROUTES }        from "@/lib/constants";

export function ItemDeleteButton({ itemId, itemName }: { itemId: string; itemName: string }) {
  const [isOpen,    setIsOpen]    = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setIsLoading(true);
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase
        .from("items")
        .delete()
        .eq("id", itemId);
      if (error) throw error;
      router.push(ROUTES.items);
      router.refresh();
    } catch {
      setIsLoading(false);
      setIsOpen(false);
    }
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setIsOpen(true)}
        className="text-neutral-400 hover:text-danger-500 hover:bg-danger-50">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
      <ConfirmDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={handleDelete}
        title="Gegenstand löschen"
        message={`Möchtest du „${itemName}" wirklich löschen?`}
        isLoading={isLoading}
      />
    </>
  );
}
