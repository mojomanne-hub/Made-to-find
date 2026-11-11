"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// Auswahl für „wie viele Tage vorher erinnern“
const LEAD_DAYS = [1, 3, 7, 14, 30];

// Meldungsarten, die man einzeln ein- und ausschalten kann (Spaltenname in notification_settings)
const TOGGLES = [
  { key: "notify_expiring",       label: "Ablaufende Gegenstände" },
  { key: "notify_item_added",     label: "Neuer Gegenstand in der Gruppe" },
  { key: "notify_location_added", label: "Neuer Ablageort in der Gruppe" },
  { key: "notify_member_joined",  label: "Neues Mitglied in der Gruppe" },
] as const;
type ToggleKey = typeof TOGGLES[number]["key"];
const ALL_ON: Record<ToggleKey, boolean> = {
  notify_expiring: true, notify_item_added: true, notify_location_added: true, notify_member_joined: true,
};

/**
 * Einstellungen für Benachrichtigungen (Stift an der Glocke) –
 * wird in der Desktop-Glocke und im mobilen Header verwendet.
 */
export function NotificationSettingsPanel() {
  const [daysBefore,   setDaysBefore]   = useState(7);
  const [onDay,        setOnDay]        = useState(true);
  const [toggles,      setToggles]      = useState<Record<ToggleKey, boolean>>(ALL_ON);
  const [saving,       setSaving]       = useState(false);
  const [settingsMsg,  setSettingsMsg]  = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createBrowserClient();
      const { data } = await supabase.from("notification_settings").select("*").maybeSingle();
      if (data) {
        setDaysBefore(data.expiry_days_before ?? 7);
        setOnDay(data.expiry_on_day ?? true);
        setToggles({
          notify_expiring:       data.notify_expiring       ?? true,
          notify_item_added:     data.notify_item_added     ?? true,
          notify_location_added: data.notify_location_added ?? true,
          notify_member_joined:  data.notify_member_joined  ?? true,
        });
      }
    })();
  }, []);

  async function saveSettings() {
    setSaving(true); setSettingsMsg(null);
    try {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from("notification_settings").upsert(
        { user_id: user.id, expiry_days_before: daysBefore, expiry_on_day: onDay, ...toggles, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
      setSettingsMsg(error ? `Fehler: ${error.message}` : "Gespeichert.");
    } finally { setSaving(false); }
  }

  return (
    <div className="px-4 pt-4 pb-5 space-y-4 overflow-y-auto" style={{ maxHeight: "min(26rem, calc(100dvh - 9rem))" }}>
      <div>
        <p className="text-xs font-semibold text-slate-200">Was soll gemeldet werden?</p>
        <ul className="mt-2 space-y-1">
          {TOGGLES.map((t) => (
            <li key={t.key}>
              <label className="flex items-center justify-between gap-3 py-1.5 text-xs text-slate-300 cursor-pointer">
                {t.label}
                <input
                  type="checkbox"
                  checked={toggles[t.key]}
                  onChange={(e) => setToggles((prev) => ({ ...prev, [t.key]: e.target.checked }))}
                  className="h-4 w-4 accent-blue-500 flex-shrink-0"
                />
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div className={cn(!toggles.notify_expiring && "opacity-40 pointer-events-none")}>
        <p className="text-xs font-semibold text-slate-200">Ablaufende Gegenstände</p>
        <p className="text-xs text-slate-500 mt-0.5">Wie viele Tage vorher möchtest du erinnert werden?</p>
        <div className="flex flex-wrap gap-2 mt-2.5">
          {LEAD_DAYS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDaysBefore(d)}
              aria-pressed={daysBefore === d}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                daysBefore === d
                  ? "bg-brand-600 border-brand-500 text-white"
                  : "border-slate-600 text-slate-300 hover:border-slate-400"
              )}
            >
              {d} {d === 1 ? "Tag" : "Tage"}
            </button>
          ))}
        </div>
      </div>
      <label className={cn("flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer", !toggles.notify_expiring && "opacity-40 pointer-events-none")}>
        <input type="checkbox" checked={onDay} onChange={(e) => setOnDay(e.target.checked)} className="h-4 w-4 accent-blue-500" />
        Zusätzlich am Ablauftag erinnern
      </label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={saveSettings}
          disabled={saving}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 text-white hover:bg-brand-500 disabled:opacity-50"
        >
          {saving ? "Speichert …" : "Speichern"}
        </button>
        {settingsMsg && <span className={cn("text-xs", settingsMsg.startsWith("Fehler") ? "text-red-400" : "text-emerald-400")}>{settingsMsg}</span>}
      </div>
      <p className="text-[11px] text-slate-500 leading-relaxed">
        Gilt für die Glocke und für Meldungen aufs Handy.
      </p>
    </div>
  );
}
