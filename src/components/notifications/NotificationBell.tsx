"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Bell, X, Package, MapPin, Users, Check, Clock, UserPlus, Pencil, ChevronLeft } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Notification {
  id:         string;
  type:       string;
  title:      string;
  message:    string;
  is_read:    boolean;
  created_at: string;
  group_id:   string | null;
}

function timeAgo(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return "gerade eben";
  if (mins < 60)  return `vor ${mins} Min.`;
  if (hours < 24) return `vor ${hours} Std.`;
  return `vor ${days} Tag${days !== 1 ? "en" : ""}`;
}

function NotifIcon({ type }: { type: string }) {
  if (type === "item_added")     return <Package  className="h-4 w-4 text-emerald-400" />;
  if (type === "location_added") return <MapPin   className="h-4 w-4 text-brand-400" />;
  if (type === "member_joined")  return <Users    className="h-4 w-4 text-amber-400" />;
  if (type === "item_expiring")  return <Clock    className="h-4 w-4 text-red-400" />;
  if (type === "new_user")       return <UserPlus className="h-4 w-4 text-sky-400" />;
  return <Bell className="h-4 w-4 text-slate-400" />;
}

function notifBg(type: string): string {
  if (type === "item_added")     return "bg-emerald-900/30";
  if (type === "location_added") return "bg-brand-900/30";
  if (type === "member_joined")  return "bg-amber-900/30";
  if (type === "item_expiring")  return "bg-red-900/30";
  if (type === "new_user")       return "bg-sky-900/30";
  return "bg-slate-700";
}

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

interface Coords {
  top:    number;
  left:   number;
  openUp: boolean; // falls unten nicht genug Platz ist
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [isOpen,        setIsOpen]        = useState(false);
  const [isLoading,     setIsLoading]     = useState(false);
  const [coords,        setCoords]        = useState<Coords | null>(null);
  const [mounted,       setMounted]       = useState(false);

  // Einstellungen (Stift): Vorwarnzeit für ablaufende Gegenstände
  const [showSettings, setShowSettings] = useState(false);
  const [daysBefore,   setDaysBefore]   = useState(7);
  const [onDay,        setOnDay]        = useState(true);
  const [toggles,      setToggles]      = useState<Record<ToggleKey, boolean>>(ALL_ON);
  const [saving,       setSaving]       = useState(false);
  const [settingsMsg,  setSettingsMsg]  = useState<string | null>(null);

  async function openSettings() {
    setShowSettings(true);
    setSettingsMsg(null);
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
  }

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

  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef  = useRef<HTMLDivElement>(null);

  const PANEL_WIDTH  = 320; // entspricht w-80
  const PANEL_MARGIN = 8;

  useEffect(() => setMounted(true), []);

  // Nur ungelesene Anzahl laden beim Start
  async function loadUnreadCount() {
    const supabase = createBrowserClient();
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("is_read", false);
    setUnreadCount(count ?? 0);
  }

  // Alle Benachrichtigungen laden wenn Dropdown öffnet
  async function loadNotifications() {
    setIsLoading(true);
    const supabase = createBrowserClient();
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setNotifications((data ?? []) as Notification[]);
    setIsLoading(false);
  }

  // Als gelesen markieren (nach kurzem Delay damit User sie sieht)
  async function markAllRead() {
    const unread = notifications.filter((n) => !n.is_read);
    if (!unread.length) return;
    const supabase = createBrowserClient();
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unread.map((n) => n.id));
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  // Position relativ zum Button berechnen (immer innerhalb des sichtbaren Viewports)
  function updateCoords() {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    // Horizontal: versuche rechts neben dem Button, sonst links davon, sonst an den rechten Rand geklemmt
    let left = rect.right + PANEL_MARGIN;
    if (left + PANEL_WIDTH > viewportW - PANEL_MARGIN) {
      left = rect.left - PANEL_WIDTH - PANEL_MARGIN;
    }
    if (left < PANEL_MARGIN) {
      left = Math.max(PANEL_MARGIN, viewportW - PANEL_WIDTH - PANEL_MARGIN);
    }

    // Vertikal: öffnet standardmäßig auf Höhe des Buttons, bei wenig Platz nach oben ausklappen
    const estimatedHeight = 420; // max-h-96 Liste + Header
    const openUp = rect.top + estimatedHeight > viewportH && rect.top > estimatedHeight;
    const top = openUp
      ? Math.max(PANEL_MARGIN, rect.bottom - estimatedHeight)
      : rect.top;

    setCoords({ top, left, openUp });
  }

  // Beim Öffnen: laden + nach 2 Sek als gelesen markieren
  async function handleOpen() {
    const newOpen = !isOpen;
    setIsOpen(newOpen);
    if (newOpen) {
      updateCoords();
      await loadNotifications();
      setTimeout(markAllRead, 2000);
    }
  }

  // Initial: nur Anzahl laden
  useEffect(() => {
    loadUnreadCount();
  }, []);

  // Realtime — nur Badge aktualisieren
  useEffect(() => {
    const supabase = createBrowserClient();
    const channel  = supabase
      .channel("notifications-bell")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const newNotif = payload.new as Notification;
          setUnreadCount((v) => v + 1);
          // Wenn Dropdown offen ist, direkt hinzufügen
          setNotifications((prev) => {
            if (prev.length > 0) return [newNotif, ...prev];
            return prev;
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Position bei Resize/Scroll neu berechnen, solange offen
  useEffect(() => {
    if (!isOpen) return;
    function handleReposition() { updateCoords(); }
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [isOpen]);

  // Klick außerhalb schließt Dropdown (Button ODER Panel zählen als "innerhalb")
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        panelRef.current  && !panelRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const panel = isOpen && coords && (
    <div
      ref={panelRef}
      className="fixed w-80 rounded-2xl shadow-2xl overflow-hidden z-[999]"
      style={{
        top:  coords.top,
        left: coords.left,
        backgroundColor: "#1a2535",
        border: "1px solid #2d3f55",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid #2d3f55" }}>
        <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
          {showSettings && (
            <button onClick={() => setShowSettings(false)} aria-label="Zurück" className="text-slate-400 hover:text-slate-200 -ml-1">
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {showSettings ? "Einstellungen" : "Benachrichtigungen"}
        </h3>
        <div className="flex items-center gap-2">
          {!showSettings && (
            <button
              onClick={openSettings}
              aria-label="Benachrichtigungen einstellen"
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {!showSettings && unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
            >
              <Check className="h-3 w-3" /> Alle gelesen
            </button>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Einstellungen */}
      {showSettings && (
        <div className="px-4 py-4 space-y-4 max-h-[26rem] overflow-y-auto">
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
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Gilt für die Glocke und für Meldungen aufs Handy. Push für dieses Gerät schaltest du unter Einstellungen → Benachrichtigungen ein.
          </p>
        </div>
      )}

      {/* Liste */}
      <div className={cn("max-h-96 overflow-y-auto", showSettings && "hidden")}>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-brand-400" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <Bell className="h-8 w-8 text-slate-600 mb-3" />
            <p className="text-sm font-medium text-slate-400">Keine Benachrichtigungen</p>
            <p className="text-xs text-slate-600 mt-1">Aktivitäten in deinen Gruppen erscheinen hier</p>
          </div>
        ) : (
          <ul>
            {notifications.map((notif) => (
              <li
                key={notif.id}
                className={cn(
                  "border-b border-slate-700/50 last:border-0 transition-colors",
                  !notif.is_read && "bg-brand-900/10"
                )}
              >
                <div className="w-full flex items-start gap-3 px-4 py-3 text-left">
                  <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5", notifBg(notif.type))}>
                    <NotifIcon type={notif.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-slate-200 truncate">{notif.title}</p>
                      {!notif.is_read && (
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-400 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{notif.message}</p>
                    <p className="text-[10px] text-slate-600 mt-1">{timeAgo(notif.created_at)}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  return (
    <div className="relative">
      {/* Glocken-Button */}
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className={cn(
          "relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
          isOpen
            ? "text-white bg-[#1e3a6e]"
            : "text-slate-400 hover:text-white hover:bg-[#1a2540]"
        )}
      >
        <div className="relative">
          <Bell className="h-4 w-4 flex-shrink-0" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-danger-500 text-white text-[9px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
        <span>Benachrichtigungen</span>
        {unreadCount > 0 && (
          <span className="ml-auto bg-danger-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown als Portal — entkommt jedem overflow:hidden/auto der Eltern-Container */}
      {mounted && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
