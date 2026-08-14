"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as LucideIcons from "lucide-react";
import { createBrowserClient }          from "@/lib/supabase/client";
import { locationSchema }               from "@/lib/validations";
import { ROUTES, LOCATION_COLORS, LOCATION_ICONS, LOCATION_EMOJIS } from "@/lib/constants";
import { Button }        from "@/components/ui/Button";
import { Input }         from "@/components/ui/Input";
import { Textarea }      from "@/components/ui/Textarea";
import { Card }          from "@/components/ui/Card";
import { Alert }         from "@/components/ui/Alert";
import { ImageCropper }  from "@/components/ui/ImageCropper";
import { cn }            from "@/lib/utils";
import type { Location } from "@/lib/types";

function DynIcon({ name, className }: { name: string; className?: string }) {
  const Icon = (LucideIcons as unknown as Record<string, React.FC<{ className?: string }>>)[name];
  if (!Icon) return <LucideIcons.Box className={className} />;
  return <Icon className={className} />;
}

type MediaTab = "emoji" | "icon" | "photo";
type IconTab = "emoji" | "icon";

interface LocationFormProps {
  location?: Location & { icon?: string | null; image_url?: string | null };
  userId:    string;
  groupId:   string | null;
}

const BUCKET     = "location-images";
const MAX_SIZE_B = 1 * 1024 * 1024; // 1 MB

export function LocationForm({ location, userId, groupId }: LocationFormProps) {
  const isEditing = !!location;
  const router    = useRouter();

  const [name,        setName]        = useState(location?.name        ?? "");
  const [description, setDescription] = useState(location?.description ?? "");
  const [color,       setColor]       = useState(location?.color       ?? LOCATION_COLORS[0].value);
  const [icon,        setIcon]        = useState(location?.icon        ?? LOCATION_ICONS[0].name);
  const [imageUrl,    setImageUrl]    = useState<string | null>(location?.image_url ?? null);
  const [mediaTab,    setMediaTab]    = useState<MediaTab>("icon");
  const [emoji,       setEmoji]       = useState("🏠");
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading,   setIsLoading]   = useState(false);
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // Cropper
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  // Komprimierungs-Dialog
  const [showCompressionDialog, setShowCompressionDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const [tempLocId] = useState(location?.id ?? crypto.randomUUID());

  const savedIcon = location?.icon ?? "";
  const isEmojiSaved = savedIcon && !LOCATION_ICONS.map(i => i.name).includes(savedIcon);
  const initialTab: IconTab = isEmojiSaved ? "emoji" : "icon";

  // Komprimieren
  async function compressImage(file: File): Promise<Blob> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let { width, height } = img;
          
          if (width > 1920) {
            height = Math.round((height * 1920) / width);
            width = 1920;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            resolve(blob || new Blob());
          }, "image/jpeg", 0.75);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  function handlePhotoSelect(file: File) {
    if (file.size > MAX_SIZE_B) {
      setPendingFile(file);
      setShowCompressionDialog(true);
    } else {
      const objectUrl = URL.createObjectURL(file);
      setCropSrc(objectUrl);
    }
  }

  async function handleCompressAndUpload() {
    if (!pendingFile) return;
    setShowCompressionDialog(false);
    
    try {
      const compressed = await compressImage(pendingFile);
      const compressedFile = new File([compressed], "image.jpg", { type: "image/jpeg" });
      
      const objectUrl = URL.createObjectURL(compressedFile);
      setCropSrc(objectUrl);
    } catch (err) {
      setServerError("Komprimierung fehlgeschlagen.");
    } finally {
      setPendingFile(null);
    }
  }

  async function handleCropDone(blob: Blob) {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setIsUploading(true);
    try {
      const file       = new File([blob], "image.jpg", { type: "image/jpeg" });
      const supabase   = createBrowserClient();
      const path       = `${userId}/${tempLocId}.jpg`;
      await supabase.storage.from(BUCKET).remove([path]);
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: "image/jpeg" });
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

async function handleEditPhoto() {
  if (!imageUrl) return;
  try {
    // Fetch die externe imageUrl
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    setCropSrc(objectUrl);
  } catch {
    setServerError("Foto konnte nicht bearbeitet werden.");
  }
}

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
      
      let finalIcon: string | null = null;
      if (mediaTab === "photo") {
        finalIcon = null;
      } else if (mediaTab === "emoji") {
        finalIcon = emoji;
      } else {
        finalIcon = icon;
      }

      const payload = {
        name:        result.data.name,
        description: result.data.description ?? null,
        color:       result.data.color,
        icon:        finalIcon,
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
      {/* Komprimierungs-Dialog */}
      {showCompressionDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-sm">
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">Bild wird komprimiert</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Dein Bild ist größer als 1 MB und wird automatisch verkleinert.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowCompressionDialog(false);
                    setPendingFile(null);
                  }}
                  disabled={isLoading}
                >
                  Abbrechen
                </Button>
                <Button
                  type="button"
                  onClick={handleCompressAndUpload}
                  isLoading={isLoading}
                >
                  Komprimieren
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Cropper Modal */}
      {cropSrc && (
        <ImageCropper
          imageSrc={cropSrc}
          onCrop={handleCropDone}
          onCancel={handleCropCancel}
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

          <div className="flex flex-col gap-3">
            <div className="flex rounded-xl overflow-hidden border border-slate-600">
              <button
                type="button"
                onClick={() => setMediaTab("emoji")}
                className={cn(
                  "flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2",
                  mediaTab === "emoji" ? "bg-brand-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                )}
              >
                😀 Emoji
              </button>
              <button
                type="button"
                onClick={() => setMediaTab("icon")}
                className={cn(
                  "flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2",
                  mediaTab === "icon" ? "bg-brand-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                )}
              >
                <LucideIcons.Shapes className="h-4 w-4" /> Icon
              </button>
              <button
                type="button"
                onClick={() => setMediaTab("photo")}
                className={cn(
                  "flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2",
                  mediaTab === "photo" ? "bg-brand-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                )}
              >
                <LucideIcons.Camera className="h-3.5 w-3.5" /> Foto
              </button>
            </div>

           {/* Vorschau */}
<div className="flex items-center justify-between px-3 py-2 rounded-xl border border-slate-700">
  <div className="flex items-center gap-3 flex-1">
    {/* Icon/Emoji/Foto */}
  </div>
  {(iconTab === "photo" || mediaTab === "photo") && (photoImageUrl || imageUrl) && (
    <button type="button" onClick={handleEditPhoto}
      className="h-8 px-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium flex items-center gap-1.5">
      <LucideIcons.Edit2 className="h-3.5 w-3.5" />
      Bearbeiten
    </button>
  )}
</div>
              <div>
                <p className="text-xs text-slate-500">Vorschau</p>
                <p className="text-sm font-medium text-slate-200">{name || "Ablageort"}</p>
              </div>
            </div>

            {/* Emoji-Auswahl */}
            {mediaTab === "emoji" && (
              <div className="space-y-3">
                {Object.entries(LOCATION_EMOJIS).map(([cat, items]) => (
                  <div key={cat}>
                    <p className="text-xs text-slate-500 capitalize mb-1.5">{cat}</p>
                    <div className="grid grid-cols-8 gap-1.5">
                      {(items as { label: string; emoji: string }[]).map((ic) => (
  <button key={ic.emoji} type="button" onClick={() => setEmoji(ic.emoji)} title={ic.label}
    className={cn("h-10 w-full rounded-xl flex items-center justify-center text-xl transition-all",
      emoji === ic.emoji
        ? "bg-brand-600/30 border-2 border-brand-400"
        : "border border-slate-600 hover:border-slate-400 hover:bg-slate-700")}>
    {ic.emoji}
  </button>
))}
                    </div>
                  </div>
                ))}
              </div>
            )}

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
              <label className={cn(
                "flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed cursor-pointer transition-colors",
                isUploading
                  ? "border-brand-500 bg-brand-900/20"
                  : "border-slate-600 hover:border-slate-500 hover:bg-slate-700/30"
              )}>
                {isUploading ? (
                  <><LucideIcons.Loader2 className="h-7 w-7 text-brand-400 animate-spin" /><span className="text-sm text-brand-400">Wird verarbeitet…</span></>
                ) : (
                  <><LucideIcons.ImagePlus className="h-7 w-7 text-slate-500" /><span className="text-sm text-slate-400">Klicken zum Hochladen</span><span className="text-xs text-slate-600">JPG, PNG, WebP · max. 1 MB (wird komprimiert)</span></>
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
