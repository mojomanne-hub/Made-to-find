"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as LucideIcons from "lucide-react";
import { Minus, Plus } from "lucide-react";
import { createBrowserClient }                 from "@/lib/supabase/client";
import { itemSchema }                          from "@/lib/validations";
import { ROUTES, ITEM_ICONS, LOCATION_COLORS } from "@/lib/constants";
import { Button }    from "@/components/ui/Button";
import { Input }     from "@/components/ui/Input";
import { Textarea }  from "@/components/ui/Textarea";
import { Card }      from "@/components/ui/Card";
import { Alert }     from "@/components/ui/Alert";
import { cn }        from "@/lib/utils";
import type { Item } from "@/lib/types";

interface LocationOption {
  id:    string;
  name:  string;
  color: string | null;
}

interface ItemFormProps {
  item?:                  Item & { icon?: string | null; image_url?: string | null; color?: string | null; expires_at?: string | null };
  locations:              LocationOption[];
  preselectedLocationId?: string;
  userId:                 string;
  groupId:                string | null;
}

type IconTab = "emoji" | "icon" | "photo";

// Alle Emojis flach
const ALL_EMOJIS = Object.entries(ITEM_ICONS).flatMap(([cat, items]) =>
  (items as { label: string; emoji: string }[]).map((i) => ({ ...i, cat }))
);

// Lucide Icon Namen (Fallback wenn kein Emoji)
const LUCIDE_ICONS = [
  "Wrench","Hammer","Screwdriver","Package","Box","Archive",
  "Laptop","Smartphone","Camera","Headphones","Battery","Monitor",
  "ShoppingBag","Gift","Star","Heart","Home","Car",
  "Bike","Dumbbell","Music","Book","Pen","Scissors",
  "Key","Lock","Flashlight","Thermometer","Clock","Calendar",
  "CakeSlice","Wine","Dices",
];

function DynIcon({ name, className }: { name: string; className?: string }) {
  const Icon = (LucideIcons as unknown as Record<string, React.FC<{ className?: string }>>)[name];
  if (!Icon) return <LucideIcons.Box className={className} />;
  return <Icon className={className} />;
}

const MAX_SIZE_B = 1 * 1024 * 1024; // 1 MB
const BUCKET = "item-images";

export function ItemForm({ item, locations, preselectedLocationId, userId, groupId }: ItemFormProps) {
  const isEditing = !!item;
  const router    = useRouter();

  // Bestimme ob gespeichertes Icon ein Emoji ist
  const savedIcon   = item?.icon ?? "";
  const isEmoji     = savedIcon && !LUCIDE_ICONS.includes(savedIcon);
  const initialTab: IconTab = isEmoji ? "emoji" : "icon";

  const [name,        setName]        = useState(item?.name        ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [quantity,    setQuantity]    = useState(item?.quantity     ?? 1);
  const [locationId,  setLocationId]  = useState(
    item?.location_id ?? preselectedLocationId ?? locations[0]?.id ?? ""
  );
  const [iconTab,     setIconTab]     = useState<IconTab>(initialTab);
  const [emoji,       setEmoji]       = useState(isEmoji ? savedIcon : "📦");
  const [lucideIcon,  setLucideIcon]  = useState(!isEmoji ? (savedIcon || "Package") : "Package");
  const [color,       setColor]       = useState(item?.color ?? LOCATION_COLORS[0].value);
  const [hasExpiry,   setHasExpiry]   = useState(!!item?.expires_at);
  const [expiresAt,   setExpiresAt]   = useState(item?.expires_at ?? "");
  const [isLoading,   setIsLoading]   = useState(false);
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // Komprimierungs-Dialog
  const [showCompressionDialog, setShowCompressionDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Photo-Image
  const [photoImageUrl, setPhotoImageUrl] = useState<string | null>(null);

  // Aktuelles Icon je nach Tab
  const currentIcon = iconTab === "emoji" ? emoji : iconTab === "icon" ? lucideIcon : null;

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
      uploadPhoto(file);
    }
  }

  async function handleCompressAndUpload() {
    if (!pendingFile) return;
    setShowCompressionDialog(false);
    
    try {
      const compressed = await compressImage(pendingFile);
      uploadPhoto(new File([compressed], "image.jpg", { type: "image/jpeg" }));
    } catch (err) {
      setServerError("Komprimierung fehlgeschlagen.");
    } finally {
      setPendingFile(null);
    }
  }

  async function uploadPhoto(file: File) {
    setIsLoading(true);
    try {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push(ROUTES.login); return; }

      const itemId = item?.id ?? crypto.randomUUID();
      const path = `${user.id}/${itemId}.jpg`;
      
      await supabase.storage.from(BUCKET).remove([path]);
      
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: "image/jpeg" });
      
      if (error) throw error;
      
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      setPhotoImageUrl(data.publicUrl);
    } catch {
      setServerError("Foto-Upload fehlgeschlagen.");
    } finally {
      setIsLoading(false);
    }
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
        icon:        currentIcon,
        image_url:   iconTab === "photo" ? photoImageUrl : null,
        color:       iconTab === "icon" ? color : "#1e2a3a",
        expires_at:  hasExpiry && expiresAt ? expiresAt : null,
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
                  Komprimieren & Hochladen
                </Button>
              </div>
            </div>
          </Card>
        </div>
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
            required autoFocus maxLength={200}
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
              <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="input-base">
                {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
              </select>
            )}
            {errors.location_id && <p className="text-xs text-danger-400">{errors.location_id}</p>}
          </div>

          {/* Menge */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Menge</label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setQuantity(Math.max(0, quantity - 1))}
                className="h-10 w-10 rounded-xl border border-slate-600 flex items-center justify-center hover:bg-slate-700 transition-colors">
                <Minus className="h-4 w-4 text-slate-400" />
              </button>
              <input type="number" value={quantity} min={0} max={9999}
                onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-20 h-10 rounded-xl border border-slate-600 bg-slate-800 text-center text-sm font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <button type="button" onClick={() => setQuantity(quantity + 1)}
                className="h-10 w-10 rounded-xl border border-slate-600 flex items-center justify-center hover:bg-slate-700 transition-colors">
                <Plus className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          </div>

          <Textarea label="Beschreibung" placeholder="Optionale Details..."
            value={description} onChange={(e) => setDescription(e.target.value)}
            rows={3} maxLength={1000} />

          {/* Ablaufdatum */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setHasExpiry((v) => !v)}
                className={cn("relative h-6 w-11 rounded-full transition-colors flex-shrink-0",
                  hasExpiry ? "bg-brand-600" : "bg-slate-700")}>
                <span className={cn("absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow transition-transform",
                  hasExpiry ? "translate-x-5" : "translate-x-0")} />
              </button>
              <span className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <LucideIcons.Calendar className="h-4 w-4 text-slate-400" />
                Ablaufdatum
              </span>
            </div>
            {hasExpiry ? (
              <div className="flex flex-col gap-1.5">
                <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="h-10 rounded-xl border border-slate-600 bg-slate-800 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  style={{ colorScheme: "dark" }} />
                <p className="text-xs text-slate-500">Du erhältst eine Benachrichtigung wenn das Datum abläuft.</p>
              </div>
            ) : (
              <p className="text-xs text-slate-600">Toggle aktivieren um ein Ablaufdatum festzulegen.</p>
            )}
          </div>

          {/* Icon/Emoji/Foto Tab */}
          <div className="flex flex-col gap-3">
            {/* Tab-Switch */}
            <div className="flex rounded-xl overflow-hidden border border-slate-600">
              <button type="button" onClick={() => setIconTab("emoji")}
                className={cn("flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2",
                  iconTab === "emoji" ? "bg-brand-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-700")}>
                😀 Emoji
              </button>
              <button type="button" onClick={() => setIconTab("icon")}
                className={cn("flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2",
                  iconTab === "icon" ? "bg-brand-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-700")}>
                <LucideIcons.Shapes className="h-4 w-4" /> Icon
              </button>
              <button type="button" onClick={() => setIconTab("photo")}
                className={cn("flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2",
                  iconTab === "photo" ? "bg-brand-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-700")}>
                <LucideIcons.Camera className="h-3.5 w-3.5" /> Foto
              </button>
            </div>

            {/* Vorschau */}
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl border border-slate-700" style={{ backgroundColor: "#1a2535" }}>
              <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: iconTab === "icon" ? color : "#2d3f55" }}>
                {iconTab === "emoji"
                  ? <span className="text-2xl">{emoji}</span>
                  : iconTab === "icon"
                  ? <DynIcon name={lucideIcon} className="h-5 w-5 text-white" />
                  : photoImageUrl ? <img src={photoImageUrl} alt="" className="h-full w-full object-cover rounded-lg" /> : <LucideIcons.ImagePlus className="h-5 w-5 text-slate-400" />
                }
              </div>
              <div>
                <p className="text-xs text-slate-500">Vorschau</p>
                <p className="text-sm font-medium text-slate-200">{name || "Gegenstand"}</p>
              </div>
            </div>

            {/* Emoji-Auswahl */}
            {iconTab === "emoji" && (
              <div className="space-y-3">
                {Object.entries(ITEM_ICONS).map(([cat, items]) => (
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

            {/* Lucide Icon-Auswahl */}
            {iconTab === "icon" && (
              <div className="grid grid-cols-8 gap-1.5">
                {LUCIDE_ICONS.map((ic) => (
                  <button key={ic} type="button" onClick={() => setLucideIcon(ic)} title={ic}
                    className={cn("h-10 w-full rounded-xl flex items-center justify-center transition-all",
                      lucideIcon === ic
                        ? "bg-brand-600 border-2 border-brand-400"
                        : "border border-slate-600 hover:border-slate-400 hover:bg-slate-700")}>
                    <DynIcon name={ic} className={cn("h-4 w-4", lucideIcon === ic ? "text-white" : "text-slate-400")} />
                  </button>
                ))}
              </div>
            )}

            {/* Foto-Upload */}
            {iconTab === "photo" && (
              <label className={cn(
                "flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed cursor-pointer transition-colors",
                isLoading
                  ? "border-brand-500 bg-brand-900/20"
                  : "border-slate-600 hover:border-slate-500 hover:bg-slate-700/30"
              )}>
                {isLoading ? (
                  <><LucideIcons.Loader2 className="h-7 w-7 text-brand-400 animate-spin" /><span className="text-sm text-brand-400">Wird hochgeladen…</span></>
                ) : (
                  <><LucideIcons.ImagePlus className="h-7 w-7 text-slate-500" /><span className="text-sm text-slate-400">Klicken zum Hochladen</span><span className="text-xs text-slate-600">JPG, PNG, WebP · max. 1 MB</span></>
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

          {/* Farbauswahl — nur bei Icons */}
          {iconTab === "icon" && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-300">Farbe auswählen</label>
              <div className="flex flex-wrap gap-2">
                {LOCATION_COLORS.map((col) => (
                  <button key={col.value} type="button" onClick={() => setColor(col.value)} title={col.label}
                    className={cn("h-9 w-9 rounded-xl transition-all duration-150",
                      color === col.value ? "ring-2 ring-offset-2 ring-white scale-110" : "hover:scale-105")}
                    style={{ backgroundColor: col.value }} />
                ))}
              </div>
            </div>
          )}

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
