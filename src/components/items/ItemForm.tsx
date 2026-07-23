"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as LucideIcons from "lucide-react";
import { Minus, Plus } from "lucide-react";
import { createBrowserClient }                    from "@/lib/supabase/client";
import { itemSchema }                             from "@/lib/validations";
import { ROUTES, ITEM_ICONS, LOCATION_COLORS }    from "@/lib/constants";
import { Button }       from "@/components/ui/Button";
import { Input }        from "@/components/ui/Input";
import { Textarea }     from "@/components/ui/Textarea";
import { Card }         from "@/components/ui/Card";
import { Alert }        from "@/components/ui/Alert";
import { cn }           from "@/lib/utils";
import type { Item }    from "@/lib/types";

function DynIcon({ name, className }: { name: string; className?: string }) {
  const Icon = (LucideIcons as unknown as Record<string, React.FC<{ className?: string }>>)[name];
  if (!Icon) return <LucideIcons.Box className={className} />;
  return <Icon className={className} />;
}

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

export function ItemForm({ item, locations, preselectedLocationId, userId, groupId }: ItemFormProps) {
  const isEditing = !!item;
  const router    = useRouter();

  const [name,        setName]        = useState(item?.name        ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [quantity,    setQuantity]    = useState(item?.quantity     ?? 1);
  const [locationId,  setLocationId]  = useState(
    item?.location_id ?? preselectedLocationId ?? locations[0]?.id ?? ""
  );
  const [icon,        setIcon]        = useState(item?.icon  ?? ITEM_ICONS[0].name);
  const [color,       setColor]       = useState(item?.color ?? LOCATION_COLORS[0].value);
  const [hasExpiry,   setHasExpiry]   = useState(!!item?.expires_at);
  const [expiresAt,   setExpiresAt]   = useState(item?.expires_at ?? "");
  const [isLoading,   setIsLoading]   = useState(false);
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

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
        icon:        icon,
        image_url:   null,
        color:       color,
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
            <button type="button" onClick={() => setQuantity(Math.max(0, quantity - 1))}
              className="h-10 w-10 rounded-xl border border-slate-600 flex items-center justify-center hover:bg-slate-700 transition-colors">
              <Minus className="h-4 w-4 text-slate-400" />
            </button>
            <input
              type="number" value={quantity} min={0} max={9999}
              onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-20 h-10 rounded-xl border border-slate-600 bg-slate-800 text-center text-sm font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button type="button" onClick={() => setQuantity(quantity + 1)}
              className="h-10 w-10 rounded-xl border border-slate-600 flex items-center justify-center hover:bg-slate-700 transition-colors">
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

        {/* Ablaufdatum */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setHasExpiry((v) => !v)}
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors flex-shrink-0",
                hasExpiry ? "bg-brand-600" : "bg-slate-700"
              )}
            >
              <span className={cn(
                "absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow transition-transform",
                hasExpiry ? "translate-x-5" : "translate-x-0"
              )} />
            </button>
            <span className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <LucideIcons.Calendar className="h-4 w-4 text-slate-400" />
              Ablaufdatum
            </span>
          </div>

          {hasExpiry ? (
            <div className="flex flex-col gap-1.5">
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="h-10 rounded-xl border border-slate-600 bg-slate-800 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                style={{ colorScheme: "dark" }}
              />
              <p className="text-xs text-slate-500">
                Du erhältst eine Benachrichtigung wenn das Datum abläuft.
              </p>
              {expiresAt && new Date(expiresAt) < new Date() && (
                <p className="text-xs text-amber-400 flex items-center gap-1">
                  <LucideIcons.AlertTriangle className="h-3.5 w-3.5" />
                  Dieses Datum liegt in der Vergangenheit.
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-600">Toggle aktivieren um ein Ablaufdatum festzulegen.</p>
          )}
        </div>

        {/* Icon-Auswahl */}
        <div className="flex flex-col gap-2">
          <div className="flex rounded-xl overflow-hidden border border-slate-600">
            <div className="flex-1 py-2.5 text-sm font-medium flex items-center justify-center bg-brand-600 text-white">
              Icon auswählen
            </div>
            <div className="flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 text-slate-500 cursor-not-allowed border-l border-slate-600">
              <LucideIcons.Camera className="h-3.5 w-3.5 text-amber-400/60" />
              <span>Foto hochladen</span>
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 rounded-full">
                <LucideIcons.Sparkles className="h-2.5 w-2.5" />
                Bald
              </span>
            </div>
          </div>
          <div className="grid grid-cols-8 gap-1.5">
            {ITEM_ICONS.map((ic) => (
              <button key={ic.name} type="button" onClick={() => setIcon(ic.name)} title={ic.label}
                className={cn(
                  "h-10 w-full rounded-xl flex items-center justify-center transition-all",
                  icon === ic.name ? "bg-brand-600 border-2 border-brand-400" : "border border-slate-600 hover:border-slate-400 hover:bg-slate-700"
                )}>
                <DynIcon name={ic.name} className={cn("h-4 w-4", icon === ic.name ? "text-white" : "text-slate-400")} />
              </button>
            ))}
          </div>
        </div>

        {/* Farbauswahl */}
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
  );
}
