"use client";

/**
 * NotificationBell – Glocke in der Sidebar mit Echtzeit-Benachrichtigungen.
 * Zeigt ungelesene Benachrichtigungen mit rotem Badge.
 * Aktualisiert sich automatisch via Supabase Realtime.
 */

import { useState, useEffect, useRef } from "react";
import { Bell, X, Package, MapPin, Users, Check } from "lucide-react";
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
  const diff = Date.now() - new Date(dateStr).getTime();
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
  return <Bell className="h-4 w-4 text-slate-400" />;
}

function notifBg(type: string): string {
  if (type === "item_added")     return "bg-emerald-900/30";
  if (type === "location_added") return "bg-brand-900/30";
  if (type === "member_joined")  return "bg-amber-900/30";
  return "bg-slate-700";
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen,        setIsOpen]        = useState(false);
  const [isLoading,     setIsLoading]     = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Benachrichtigungen laden
  async function loadNotifications() {
    const supabase = createBrowserClient();
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setNotifications((data ?? []) as Notification[]);
    setIsLoading(false);
  }

  // Alle als gelesen markieren
  async function markAllRead() {
    const unread = notifications.filter((n) => !n.is_read);
    if (!unread.length) return;
    const supabase = createBrowserClient();
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unread.map((n) => n.id));
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  // Eine als gelesen markieren
  async function markRead(id: string) {
    const supabase = createBrowserClient();
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, is_read: true } : n)
    );
  }

  // Beim Öffnen laden + als gelesen markieren
  function handleOpen() {
    setIsOpen((v) => !v);
    if (!isOpen) {
      loadNotifications();
      setTimeout(markAllRead, 1500); // kurz warten damit User sie sieht
    }
  }

  // Initial laden
  useEffect(() => {
    loadNotifications();
  }, []);

  // Realtime-Subscription
  useEffect(() => {
    const supabase = createBrowserClient();
    const channel  = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Klick außerhalb schließt Dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Glocken-Button */}
      <button
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

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute left-full top-0 ml-2 w-80 rounded-2xl shadow-2xl overflow-hidden z-50"
          style={{ backgroundColor: "#1a2535", border: "1px solid #2d3f55" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid #2d3f55" }}>
            <h3 className="text-sm font-semibold text-slate-100">Benachrichtigungen</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
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

          {/* Liste */}
          <div className="max-h-96 overflow-y-auto">
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
                    <button
                      onClick={() => markRead(notif.id)}
                      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-700/30 text-left transition-colors"
                    >
                      {/* Icon */}
                      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5", notifBg(notif.type))}>
                        <NotifIcon type={notif.type} />
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-slate-200 truncate">
                            {notif.title}
                          </p>
                          {!notif.is_read && (
                            <span className="h-1.5 w-1.5 rounded-full bg-brand-400 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-slate-600 mt-1">
                          {timeAgo(notif.created_at)}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
