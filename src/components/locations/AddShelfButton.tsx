"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, X } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";

interface AddShelfButtonProps {
  locationId: string;
  userId: string;
  nextPosition: number;
}

export function AddShelfButton({ locationId, userId, nextPosition }: AddShelfButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) { setError("Bitte einen Namen eingeben."); return; }
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createBrowserClient();
      const { error: insertError } = await supabase.from("shelves").insert({
        location_id: locationId,
        user_id: userId,
        name: trimmed,
        position: nextPosition,
      });
      if (insertError) throw insertError;
      setName("");
      setIsOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-dashed border-slate-600 text-sm font-medium text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors"
      >
        <Plus className="h-4 w-4" /> Fach / Ebene hinzufügen
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl border border-slate-700" style={{ backgroundColor: "#1a2535" }}>
      {error && <p className="text-xs text-danger-400">{error}</p>}
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="z.B. Oben, Mitte, Unten..."
          maxLength={50}
          autoFocus
          className="flex-1 min-w-0 h-10 rounded-xl border border-slate-600 bg-slate-800 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={isLoading}
          className="h-10 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-1.5 flex-shrink-0"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Speichern"}
        </button>
        <button
          type="button"
          onClick={() => { setIsOpen(false); setName(""); setError(null); }}
          disabled={isLoading}
          title="Abbrechen"
          className="h-10 w-10 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors flex items-center justify-center flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
