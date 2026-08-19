"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as LucideIcons from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { locationSchema } from "@/lib/validations";
import { ROUTES, LOCATION_COLORS, LOCATION_ICONS, LOCATION_EMOJIS } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { ImageCropper } from "@/components/ui/ImageCropper";
import { cn } from "@/lib/utils";
import type { Location } from "@/lib/types";

function DynIcon({ name, className }: { name: string; className?: string }) {
  const Icon = (LucideIcons as unknown as Record<string, React.FC<{ className?: string }>>)[name];
  if (!Icon) return <LucideIcons.Box className={className} />;
  return <Icon className={className} />;
}

type MediaTab = "emoji" | "icon" | "photo";
type IconTab = "emoji" | "icon";

interface ShelfRow {
  id: string;
  name: string;
  isNew?: boolean;
}

interface LocationFormProps {
  location?: Location & { icon?: string | null; image_url?: string | null };
  userId: string;
  groupId: string | null;
  initialShelves?: { id: string; name: string }[];
}

const BUCKET = "location-images";
const MAX_SIZE_B = 1 * 1024 * 1024;

export function LocationForm({ location, userId, groupId, initialShelves = [] }: LocationFormProps) {
  const isEditing = !!location;
  const router = useRouter();

  const [name, setName] = useState(location?.name ?? "");
  const [description, setDescription] = useState(location?.description ?? "");
  const [color, setColor] = useState(location?.color ?? LOCATION_COLORS[0].value);
  const [icon, setIcon] = useState(location?.icon ?? LOCATION_ICONS[0].name);
  const [imageUrl, setImageUrl] = useState<string | null>(location?.image_url ?? null);
  const [mediaTab, setMediaTab] = useState<MediaTab>("icon");
  const [emoji, setEmoji] = useState("🏠");
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [showCompressionDialog, setShowCompressionDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const [tempLocId] = useState(location?.id ?? crypto.randomUUID());

  // ── Fachböden ──────────────────────────────────────────────
  const [hasShelves, setHasShelves] = useState(initialShelves.length > 0);
  const [shelves, setShelves] = useState<ShelfRow[]>(
    initialShelves.length > 0 ? initialShelves.map((s) => ({ id: s.id, name: s.name })) : []
  );
  const [removedShelfIds, setRemovedShelfIds] = useState<string[]>([]);

  function addShelf() {
    setShelves((prev) => [...prev, { id: crypto.randomUUID(), name: "", isNew: true }]);
  }

  function updateShelfName(id: string, value: string) {
    setShelves((prev) => prev.map((s) => (s.id === id ? { ...s, name: value } : s)));
  }

  function removeShelf(id: string) {
    setShelves((prev) => prev.filter((s) => s.id !== id));
    const wasExisting = initialShelves.some((s) => s.id === id);
    if (wasExisting) setRemovedShelfIds((prev) => [...prev, id]);
  }

  function toggleHasShelves() {
    setHasShelves((v) => {
      const next = !v;
      if (!next) {
        // Alle vorhandenen Fachböden zum Löschen markieren, Liste leeren
        const existingIds = shelves.filter((s) => !s.isNew).map((s) => s.id);
        setRemovedShelfIds((prev) => [...prev, ...existingIds]);
        setShelves([]);
      } else if (shelves.length === 0) {
        addShelf();
      }
      return next;
    });
  }

  const savedIcon = location?.icon ?? "";
  const isEmojiSaved = savedIcon && !LOCATION_ICONS.map(i => i.name).includes(savedIcon);
  const initialTab: IconTab = isEmojiSaved ? "emoji" : "icon";

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

  async function handleEditPhoto() {
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      setCropSrc(objectUrl);
    } catch {
      setServerError("Foto konnte nicht bearbeitet werden.");
    }
  }

  async function handleCropDone(blob: Blob) {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setIsUploading(true);
    try {
      const file = new File([blob], "image.jpg", { type: "image/jpeg" });
      const supabase = createBrowserClient();
      const path = `${userId}/${tempLocId}.jpg`;
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

  async function syncShelves(supabase: ReturnType<typeof createBrowserClient>, locationId: string) {
    // Entfernte Fachböden löschen
    if (removedShelfIds.length > 0) {
      await supabase.from("shelves").delete().in("id", removedShelfIds);
    }

    if (!hasShelves) return;

    const trimmed = shelves
      .map((s, idx) => ({ ...s, name: s.name.trim(), position: idx }))
      .filter((s) => s.name.length > 0);

    const toInsert = trimmed.filter((s) => s.isNew);
    const toUpdate = trimmed.filter((s) => !s.isNew);

    if (toInsert.length > 0) {
      await supabase.from("shelves").insert(
        toInsert.map((s) => ({
          location_id: locationId,
          user_id: userId,
          name: s.name,
          position: s.position,
        }))
      );
    }

    for (const s of toUpdate) {
      await supabase.from("shelves").update({ name: s.name, position: s.position }).eq("id", s.id);
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

    if (hasShelves && shelves.filter((s) => s.name.trim().length > 0).length === 0) {
      setServerError("Füge mindestens einen Fachboden hinzu oder deaktiviere die Fachboden-Option.");
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
        name: result.data.name,
        description: result.data.description ?? null,
        color: result.data.color,
        icon: finalIcon,
        image_url: mediaTab === "photo" ? imageUrl : null,
      };

      if (isEditing) {
        const { error } = await supabase.from("locations").update(payload).eq("id", location.id);
        if (error) { setServerError(`Fehler: ${error.message}`); return; }
        await syncShelves(supabase, location.id);
        router.push(ROUTES.locationDetail(location.id));
      } else {
        const { data, error } = await supabase
          .from("locations")
          .insert({ ...payload, user_id: userId, ...(groupId ? { group_id: groupId } : {}) })
          .select().single();
        if (error) { setServerError(`Fehler: ${error.message}`); return; }
        await syncShelves(supabase, data.id);
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

      {cropSrc && (
        <ImageCropper imageSrc={cropSrc} onCrop={handleCropDone} onCancel={handleCropCancel} />
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
            required autoFocus maxLength={100}
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

            <div className="flex items-center justify-between px-3 py-2 rounded-xl border border-slate-700" style={{ backgroundColor: "#1a2535" }}>
              <div className="flex items-center gap-3 flex-1">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                  style={{ backgroundColor: mediaTab === "icon" ? color : "#2d3f55" }}>
                  {mediaTab === "emoji"
                    ? <span className="text-2xl">{emoji}</span>
                    : mediaTab === "icon"
                    ? <DynIcon name={icon} className="h-5 w-5 text-white" />
                    : imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-cover" /> : <LucideIcons.ImagePlus className="h-5 w-5 text-slate-400" />
                  }
                </div>
                <div>
                  <p className="text-xs text-slate-500">Vorschau</p>
                  <p className="text-sm font-medium text-slate-200">{name || "Ablageort"}</p>
                </div>
              </div>
              {mediaTab === "photo" && imageUrl && (
                <button
                  type="button"
                  onClick={handleEditPhoto}
                  className="h-8 px-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium transition-colors flex items-center gap-1.5 flex-shrink-0">
                  <LucideIcons.Edit2 className="h-3.5 w-3.5" />
                  Bearbeiten
                </button>
              )}
            </div>

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

          {/* ── Fachböden ── */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleHasShelves}
                className={cn(
                  "relative h-6 w-11 rounded-full transition-colors flex-shrink-0",
                  hasShelves ? "bg-brand-600" : "bg-slate-700"
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow transition-transform",
                    hasShelves ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
              <span className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <LucideIcons.Rows3 className="h-4 w-4 text-slate-400" />
                Fachböden
              </span>
            </div>

            {hasShelves ? (
              <div className="flex flex-col gap-2">
                {shelves.map((shelf, idx) => (
                  <div key={shelf.id} className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-5 flex-shrink-0 text-right">{idx + 1}.</span>
                    <input
                      type="text"
                      value={shelf.name}
                      onChange={(e) => updateShelfName(shelf.id, e.target.value)}
                      placeholder="z.B. Oben, Mitte, Unten..."
                      maxLength={50}
                      className="flex-1 h-10 rounded-xl border border-slate-600 bg-slate-800 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeShelf(shelf.id)}
                      className="h-10 w-10 rounded-xl border border-slate-600 flex items-center justify-center text-slate-400 hover:text-danger-400 hover:border-danger-500/50 transition-colors flex-shrink-0"
                    >
                      <LucideIcons.Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <Button type="button" variant="secondary" size="sm" onClick={addShelf} className="self-start">
                  <LucideIcons.Plus className="h-4 w-4" /> Fachboden hinzufügen
                </Button>
                <p className="text-xs text-slate-500">
                  Beim Hinzufügen von Gegenständen muss hier ein Fachboden ausgewählt werden.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-600">
                Aktivieren, um diesen Ablageort in Fachböden zu unterteilen (z.B. für Regale).
              </p>
            )}
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
