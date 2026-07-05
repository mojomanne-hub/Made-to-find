"use client";

/**
 * LocationForm – Ablageort erstellen/bearbeiten.
 * Tab-Wechsel zwischen Icon-Auswahl und Foto-Upload (wie im Screenshot).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as LucideIcons from "lucide-react";
import { createBrowserClient }          from "@/lib/supabase/client";
import { locationSchema }               from "@/lib/validations";
import { ROUTES, LOCATION_COLORS, LOCATION_ICONS } from "@/lib/constants";
import { Button }    from "@/components/ui/Button";
import { Input }     from "@/components/ui/Input";
import { Textarea }  from "@/components/ui/Textarea";
import { Card }      from "@/components/ui/Card";
import { Alert }     from "@/components/ui/Alert";
import { cn }        from "@/lib/utils";
import type { Location } from "@/lib/types";
import { compressImage } from "@/lib/utils/compress-image";

// Dynamisches Icon-Rendering aus Lucide
function DynIcon({ name, className }: { name: string; className?: string }) {
  const Icon = (LucideIcons as unknown as Record<string, React.FC<{ className?: string }>>)[name];
  if (!Icon) return <LucideIcons.Box className={className} />;
  return <Icon className={className} />;
}

type MediaTab = "icon" | "photo";

interface LocationFormProps {
  location?: Location & { icon?: string | null; image_url?: string | null };
  userId:    string;
  groupId:   string | null;
}

const BUCKET = "location-images";
const MAX_SIZE_B = 2 * 1024 * 1024;

export function LocationForm({ location, userId, groupId }: LocationFormProps) {
  const isEditing = !!location;
  const router    = useRouter();

  const [name,        setName]        = useState(location?.name        ?? "");
  const [description, setDescription] = useState(location?.description ?? "");
  const [color,       setColor]       = useState(location?.color       ?? LOCATION_COLORS[0].value);
  const [icon,        setIcon]        = useState(location?.icon        ?? LOCATION_ICONS[0].name);
  const [imageUrl,    setImageUrl]    = useState<string | null>(location?.image_url ?? null);
  const [mediaTab,    setMediaTab]    = useState<MediaTab>("icon");
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading,   setIsLoading]   = useState(false);
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // Foto-Upload Handler
 async function handlePhotoUpload(file: File) {
    if (file.size > MAX_SIZE_B) { setServerError("Bild zu groß (max. 2 MB)."); return; }
    setIsUploading(true);
    try {
      // Bild komprimieren vor Upload
      const compressed = await compressImage(file);
      file = compressed;
      const supabase = createBrowserClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    const result = locationSchema.safeParse({ name, description, color });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const err of result.error.errors) {
        const field = String(err.path[0]);
        if (!fieldErrors[field]) fieldErrors[field] = err.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createBrowserClient();
      const payload = {
        name:        result.data.name,
        description: result.data.description ?? null,
        color:       result.data.color,
        icon:        mediaTab === "icon" ? icon : null,
        image_url:   mediaTab === "photo" ? imageUrl : null,
      };

      if (isEditing) {
        const { error } = await supabase.from("locations").update(payload).eq("id", location.id);
        if (error) { setServerError(`Fehler: ${error.message}`); return; }
        router.push(ROUTES.locationDetail(location.id));
      } else {
        const { data, error } = await supabase
          .from("locations")
          .insert({ ...payload, user_id: userId, ...(groupId ? { group_id: groupId } : {}) })
          .select().single();
        if (error) { setServerError(`Fehler: ${error.message}`); return; }
        router.push(ROUTES.locationDetail(data.id));
      }
      router.refresh();
    } catch (err) {
      setServerError(`Fehler: ${err instanceof Error ? err.message : "Unbekannt"}`);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {cropSrc && (
        <ImageCropper
          imageSrc={cropSrc}
          onCrop={handleCropDone}
          onCancel={handleCropCancel}
          aspect={4 / 3}
        />
      )}
      <Card>
      <form onSubmit={handleSubmit} className="space-y-5">
        {serverError && <Alert variant="error">{serverError}</Alert>}

        <Input
          label="Name"
          placeholder="z.B. Keller, Garage, Dachboden..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          required
          autoFocus
          maxLength={100}
        />

        <Textarea
          label="Beschreibung"
          placeholder="Optionale Beschreibung des Ablageortes..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={500}
          hint="Optional – hilft beim Wiederfinden"
        />

        {/* Tab-Wechsel: Icon / Foto */}
        <div className="flex flex-col gap-3">
          <div className="flex rounded-xl overflow-hidden border border-slate-600">
            <button
              type="button"
              onClick={() => setMediaTab("icon")}
              className={cn(
                "flex-1 py-2.5 text-sm font-medium transition-colors",
                mediaTab === "icon"
                  ? "bg-brand-600 text-white"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-700"
              )}
            >
              Icon auswählen
            </button>
            <button
              type="button"
              onClick={() => setMediaTab("photo")}
              className={cn(
                "flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2",
                mediaTab === "photo"
                  ? "bg-brand-600 text-white"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-700"
              )}
            >
              <LucideIcons.Camera className="h-3.5 w-3.5" />
              Foto hochladen
            </button>
          </div>

          {/* Icon-Auswahl */}
          {mediaTab === "icon" && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-slate-400">Icon auswählen</p>
              <div className="grid grid-cols-8 gap-1.5">
                {LOCATION_ICONS.map((ic) => (
                  <button
                    key={ic.name}
                    type="button"
                    onClick={() => setIcon(ic.name)}
                    title={ic.label}
                    className={cn(
                      "h-10 w-full rounded-xl flex items-center justify-center transition-all",
                      icon === ic.name
                        ? "bg-brand-600 border-2 border-brand-400"
                        : "border border-slate-600 hover:border-slate-400 hover:bg-slate-700"
                    )}
                  >
                    <DynIcon
                      name={ic.name}
                      className={cn("h-4 w-4", icon === ic.name ? "text-white" : "text-slate-400")}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Foto-Upload */}
          {mediaTab === "photo" && (
            <div>
              {imageUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-600">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt="Vorschau" className="w-full h-40 object-cover" />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <label className="h-8 px-3 rounded-lg bg-black/50 text-white text-xs font-medium hover:bg-black/70 cursor-pointer flex items-center gap-1.5">
                      <LucideIcons.Upload className="h-3.5 w-3.5" /> Ersetzen
                      <input type="file" accept="image/*" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); }} />
                    </label>
                    <button type="button" onClick={() => setImageUrl(null)}
                      className="h-8 w-8 rounded-lg bg-black/50 text-white hover:bg-danger-600/80 flex items-center justify-center">
                      <LucideIcons.X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <label className={cn(
                  "flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed cursor-pointer transition-colors",
                  isUploading ? "border-brand-500 bg-brand-900/20" : "border-slate-600 hover:border-slate-500 hover:bg-slate-700/30"
                )}>
                  {isUploading
                    ? <><LucideIcons.Loader2 className="h-7 w-7 text-brand-400 animate-spin" /><span className="text-sm text-brand-400">Wird hochgeladen…</span></>
                    : <><LucideIcons.ImagePlus className="h-7 w-7 text-slate-500" /><span className="text-sm text-slate-400">Klicken zum Hochladen</span><span className="text-xs text-slate-600">JPG, PNG, WebP · max. 2 MB</span></>
                  }
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); }} />
                </label>
              )}
            </div>
          )}
        </div>

        {/* Farbauswahl */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-300">Farbe auswählen</label>
          <div className="flex flex-wrap gap-2">
            {LOCATION_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                title={c.label}
                className={cn(
                  "h-9 w-9 rounded-xl transition-all duration-150",
                  color === c.value ? "ring-2 ring-offset-2 ring-white scale-110" : "hover:scale-105"
                )}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={() => router.back()} disabled={isLoading}>
            Abbrechen
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {isEditing ? "Speichern" : "Erstellen"}
          </Button>
        </div>
      </form>
    </Card>
</>
  );
}
