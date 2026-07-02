"use client";

/**
 * BottomNav – Mobile Navigation (unten).
 * 4 Tabs: Übersicht, Ablageorte, Gegenstände, Benachrichtigungen
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MapPin, Package, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import { createBrowserClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: ROUTES.dashboard, label: "Übersicht",   icon: LayoutDashboard },
  { href: ROUTES.locations, label: "Ablageorte",  icon: MapPin },
  { href: ROUTES.items,     label: "Gegenstände", icon: Package },
];

export function BottomNav() {
  const pathname     = usePathname();
  const [unread, setUnread] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);

  // Ungelesene Benachrichtigungen laden
  useEffect(() => {
    async function loadUnread() {
      const supabase = createBrowserClient();
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false);
      setUnread(count ?? 0);
    }
    loadUnread();

    // Realtime
    const supabase = createBrowserClient();
    const channel = supabase
      .channel("notifications-mobile")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" },
        () => setUnread((v) => v + 1)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function handleBellClick() {
    setShowNotifs((v) => !v);
    if (!showNotifs && unread > 0) {
      // Alle als gelesen markieren
      const supabase = createBrowserClient();
      await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
      setUnread(0);
    }
  }

  return (
    <>
      {/* Benachrichtigungen Overlay */}
      {showNotifs && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/60"
          onClick={() => setShowNotifs(false)}
        >
          <div
            className="absolute bottom-16 left-0 right-0 mx-3 rounded-2xl overflow-hidden shadow-2xl"
            style={{ backgroundColor: "#1a2535", border: "1px solid #2d3f55" }}
            onClick={(e) => e.stopPropagation()}
          >
            <NotifList onClose={() => setShowNotifs(false)} />
          </div>
        </div>
      )}

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 pb-safe"
        style={{ backgroundColor: "#0f1729", borderTop: "1px solid #1e2d4a" }}>
        <div className="flex items-stretch h-16">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive =
              pathname === href ||
              (href !== ROUTES.dashboard && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                  isActive ? "text-brand-400" : "text-slate-500 hover:text-white"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive && "text-brand-400")} />
                {label}
              </Link>
            );
          })}

          {/* Glocke */}
          <button
            onClick={handleBellClick}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
              showNotifs ? "text-brand-400" : "text-slate-500 hover:text-white"
            )}
          >
            <div className="relative">
              <Bell className={cn("h-5 w-5", showNotifs && "text-brand-400")} />
              {unread > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-danger-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </div>
            Neu
          </button>
        </div>
      </nav>
    </>
  );
}

// Benachrichtigungs-Liste für Mobile
function NotifList({ onClose }: { onClose: () => void }) {
  const [notifications, setNotifications] = useState<Array<{
    id: string; type: string; title: string; message: string;
    is_read: boolean; created_at: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient();
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      setNotifications(data ?? []);
      setIsLoading(false);
    }
    load();
  }, []);

  function timeAgo(dateStr: string): string {
    const diff  = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (mins < 1)   return "gerade eben";
    if (mins < 60)  return `vor ${mins} Min.`;
    if (hours < 24) return `vor ${hours} Std.`;
    return `vor ${Math.floor(diff / 86400000)} Tagen`;
  }

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid #2d3f55" }}>
        <h3 className="text-sm font-semibold text-slate-100">Benachrichtigungen</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-xs">
          Schließen
        </button>
      </div>
      <div className="max-h-72 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-brand-400" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-7 w-7 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Keine Benachrichtigungen</p>
          </div>
        ) : (
          <ul>
            {notifications.map((n) => (
              <li key={n.id} className="px-4 py-3 border-b border-slate-700/50 last:border-0">
                <p className="text-xs font-semibold text-slate-200">{n.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{n.message}</p>
                <p className="text-[10px] text-slate-600 mt-1">{timeAgo(n.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
