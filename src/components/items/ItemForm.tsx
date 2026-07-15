"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as LucideIcons from "lucide-react";
import { Minus, Plus } from "lucide-react";
import { createBrowserClient }         from "@/lib/supabase/client";
import { itemSchema }                  from "@/lib/validations";
import { ROUTES, ITEM_ICONS, LOCATION_COLORS } from "@/lib/constants";
import { compressImage }               from "@/lib/utils/compress-image";
import { Button }        from "@/components/ui/Button";
import { Input }         from "@/components/ui/Input";
import { Textarea }      from "@/components/ui/Textarea";
import { Card }          from "@/components/ui/Card";
import { Alert }         from "@/components/ui/Alert";
import { ImageCropper }  from "@/components/ui/ImageCropper";
import { cn }            from "@/lib/utils";
import type { Item }     from "@/lib/types";

function DynIcon({ name, className }: { name: string; className?: string }) {
  const Icon = (LucideIcons as unknown as Record<string, React.FC<{ className?: string }>>)[name];
  if (!Icon) return <LucideIcons.Box className={className} />;
  return <Icon className={className} />;
}

type MediaTab = "icon" | "photo";

interface LocationOption {
  id:    string;
  name:  string;
  color: string | null;
}

interface ItemFormProps {
  item?:                  Item & { icon?: string | null; image_url?: string | null; color?: string | null };
  locations:              LocationOption[];
  preselectedLocationId?: string;
  userId:                 string;
  groupId:                string | null;
}

const BUCKET     = "item-images";
const MAX_SIZE_B = 10 * 1024 * 1024; // 10 MB vor Crop/Komprimierung

export function ItemForm({ item, locations, preselectedLocationId, userId, groupId }: ItemFormProps) {
  const isEditing = !!item;
  const router    = useRouter();

  const [name,        setName]        = useState(item?.name        ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [quantity,    setQuantity]    = useState(item?.quantity     ?? 1);
  const [locationId,  setLocationId]  = useState(
    item?.location_id ?? preselectedLocationId ?? locations[0]?.id ?? ""
  );
  const [icon,        setIcon]        = useState(item?.icon        ?? ITEM_ICONS[0].name);
  const [color,       setColor]       = useState(item?.color       ?? LOCATION_COLORS[0].value);
  const [imageUrl,    setImageUrl]    = useState<string | null>(item?.image_url ?? null);
  const [mediaTab,    setMediaTab]    = useState<MediaTab>("icon");
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading,   setIsLoading]   = useState(false);
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // Cropper State
  const [cropSrc,     setCropSrc]     = useState<string | null>(null);

  const [tempItemId] = useState(item?.id ?? crypto.randomUUID());

  // Foto ausgewählt → Cropper öffnen
  function handlePhotoSelect(file: File) {
  console.log("handlePhotoSelect aufgerufen", file.name);
  if (file.size > MAX_SIZE_B) {
    setServerError("Bild zu groß (max. 10 MB).");
    return;
  }
  const objectUrl = URL.createObjectURL(file);
  console.log("cropSrc gesetzt:", objectUrl);
  setCropSrc(objectUrl);
}

  // Nach Crop → komprimieren + hochladen
  async function handleCropDone(blob: Blob) {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setIsUploading(true);
    try {
      const file       = new File([blob], "image.jpg", { type: "image/jpeg" });
      const compressed = await compressImage(file);
      const supabase   = createBrowserClient();
      const path       = `${userId}/${tempItemId}.jpg`;
      await supabase.storage.from(BUCKET).remove([path]);
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, compressed, { upsert: true, contentType: "image/jpeg" });
      if (error) throw error;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      setImageUrl(`${data.publicUrl}?t=${Date.now()}`);
    } catch {
      setServerError("Upload fehlgeschlagen.");
    } finally {
      setIsUploading(false);
    }
  }

  function handleCropCancel() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    const result = itemSchema.safeParse({ name, description, quantity, location_id: locationId });
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push(ROUTES.login); return; }

      const payload = {
        name:        result.data.name,
        description: result.data.description ?? null,
        quantity:    result.data.quantity,
        location_id: result.data.location_id,
        icon:        mediaTab === "icon"  ? icon     : null,
        image_url:   mediaTab === "photo" ? imageUrl : null,
        color:       color,
      };

      if (isEditing) {
        const { error } = await supabase.from("items").update(payload).eq("id", item.id);
        if (error) { setServerError(`Fehler: ${error.message}`); return; }
        router.push(ROUTES.itemDetail(item.id));
      } else {
        const { data, error } = await supabase
          .from("items")
          .insert({ ...payload, user_id: user.id, ...(groupId ? { group_id: groupId } : {}) })
          .select().single();
        if (error) { setServerError(`Fehler: ${error.message}`); return; }
        router.push(ROUTES.itemDetail(data.id));
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
      {/* Cropper Modal */}
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
            placeholder="z.B. Akkuschrauber, Reisepass..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            required
            autoFocus
            maxLength={200}
          />

          {/* Ablageort */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">
              Ablageort <span className="text-danger-400">*</span>
            </label>
            {locations.length === 0 ? (
              <Alert variant="warning">
                Erstelle zuerst einen <a href={ROUTES.locationNew} className="font-semibold underline">Ablageort</a>.
              </Alert>
            ) : (
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="input-base"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            )}
            {errors.location_id && <p className="text-xs text-danger-400">{errors.location_id}</p>}
          </div>

          {/* Menge */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Menge</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(0, quantity - 1))}
                className="h-10 w-10 rounded-xl border border-slate-600 flex items-center justify-center hover:bg-slate-700 transition-colors"
              >
                <Minus className="h-4 w-4 text-slate-400" />
              </button>
              <input
                type="number"
                value={quantity}
                min={0}
                max={9999}
                onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-20 h-10 rounded-xl border border-slate-600 bg-slate-800 text-center text-sm font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="h-10 w-10 rounded-xl border border-slate-600 flex items-center justify-center hover:bg-slate-700 transition-colors"
              >
                <Plus className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          </div>

          <Textarea
            label="Beschreibung"
            placeholder="Optionale Details..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={1000}
          />

          {/* Tab: Icon / Foto */}
          <div className="flex flex-col gap-3">
            <div className="flex rounded-xl overflow-hidden border border-slate-600">
              <button
                type="button"
                onClick={() => setMediaTab("icon")}
                className={cn(
                  "flex-1 py-2.5 text-sm font-medium transition-colors",
                  mediaTab === "icon" ? "bg-brand-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                )}
              >
                Icon auswählen
              </button>
              <button
                type="button"
                onClick={() => setMediaTab("photo")}
                className={cn(
                  "flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2",
                  mediaTab === "photo" ? "bg-brand-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                )}
              >
                <LucideIcons.Camera className="h-3.5 w-3.5" />
                Foto hochladen
              </button>
            </div>

            {/* Icon-Raster */}
            {mediaTab === "icon" && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-slate-400">Icon auswählen</p>
                <div className="grid grid-cols-8 gap-1.5">
                  {ITEM_ICONS.map((ic) => (
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

            {/* Foto-Upload mit Cropper */}
            {mediaTab === "photo" && (
              <div>
                {imageUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-600">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="Vorschau" className="w-full h-40 object-cover" />
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <LucideIcons.Loader2 className="h-8 w-8 text-white animate-spin" />
                      </div>
                    )}
                    {!isUploading && (
                      <div className="absolute top-2 right-2 flex gap-2">
                        <label className="h-8 px-3 rounded-lg bg-black/50 text-white text-xs font-medium hover:bg-black/70 cursor-pointer flex items-center gap-1.5">
                          <LucideIcons.Upload className="h-3.5 w-3.5" /> Ersetzen
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoSelect(f); }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setImageUrl(null)}
                          className="h-8 w-8 rounded-lg bg-black/50 text-white hover:bg-danger-600/80 flex items-center justify-center"
                        >
                          <LucideIcons.X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <label className={cn(
                    "flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed cursor-pointer transition-colors",
                    isUploading
                      ? "border-brand-500 bg-brand-900/20"
                      : "border-slate-600 hover:border-slate-500 hover:bg-slate-700/30"
                  )}>
                    {isUploading ? (
                      <><LucideIcons.Loader2 className="h-7 w-7 text-brand-400 animate-spin" /><span className="text-sm text-brand-400">Wird hochgeladen…</span></>
                    ) : (
                      <><LucideIcons.ImagePlus className="h-7 w-7 text-slate-500" /><span className="text-sm text-slate-400">Klicken zum Hochladen</span><span className="text-xs text-slate-600">JPG, PNG, WebP · dann zuschneiden</span></>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoSelect(f); }}
                    />
                  </label>
                )}
              </div>
            )}
          </div>

          {/* Farbauswahl */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-300">Farbe auswählen</label>
            <div className="flex flex-wrap gap-2">
              {LOCATION_COLORS.map((col) => (
                <button
                  key={col.value}
                  type="button"
                  onClick={() => setColor(col.value)}
                  title={col.label}
                  className={cn(
                    "h-9 w-9 rounded-xl transition-all duration-150",
                    color === col.value ? "ring-2 ring-offset-2 ring-white scale-110" : "hover:scale-105"
                  )}
                  style={{ backgroundColor: col.value }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => router.back()} disabled={isLoading}>
              Abbrechen
            </Button>
            <Button type="submit" isLoading={isLoading} disabled={locations.length === 0}>
              {isEditing ? "Speichern" : "Erstellen"}
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
