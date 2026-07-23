"use client";

/**
 * MobileHeader – Obere Leiste auf Mobile.
 * Links: Hamburger-Icon (öffnet Drawer)
 * Mitte: Gruppen-Dropdown
 * Rechts: Glocke + Logo
 */

import { useState, useEffect } from "react";
import Image from "next/image";
import { Menu, ChevronDown, Check, Bell, X } from "lucide-react";
import { useGroup, type Group } from "@/lib/context/GroupContext";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import Link from "next/link";

const GROUP_COLORS = [
  "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899",
];

function groupColor(id: string) {
  let hash = 0;
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return GROUP_COLORS[Math.abs(hash) % GROUP_COLORS.length];
}

interface MobileHeaderProps {
  onMenuOpen:  () => void;
  groups:      Group[];
  displayName: string;
}

export function MobileHeader({ onMenuOpen, groups, displayName }: MobileHeaderProps) {
  const router = useRouter();
  const { activeGroup, setActiveGroup } = useGroup();
  const [dropdownOpen,  setDropdownOpen]  = useState(false);
  const [showNotifs,    setShowNotifs]    = useState(false);
  const [unread,        setUnread]        = useState(0);
  const [notifications, setNotifications] = useState<Array<{
    id: string; title: string; message: string; created_at: string;
  }>>([]);

  const contextLabel = activeGroup ? activeGroup.name : "Meine Daten";

  // Ungelesene laden
  useEffect(() => {
    async function load() {
      const supabase = createBrowserClient();
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false);
      setUnread(count ?? 0);
    }
    load();

    const supabase = createBrowserClient();
    const channel = supabase
      .channel("notif-header")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" },
        () => setUnread((v) => v + 1))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function handleBellClick() {
    setShowNotifs((v) => !v);
    setDropdownOpen(false);
    if (!showNotifs) {
      const supabase = createBrowserClient();
      const { data } = await supabase
        .from("notifications")
        .select("id, title, message, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      setNotifications(data ?? []);
      if (unread > 0) {
        await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
        setUnread(0);
      }
    }
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "gerade eben";
    if (mins < 60) return `vor ${mins} Min.`;
    return `vor ${Math.floor(diff / 3600000)} Std.`;
  }

  return (
    <>
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center gap-2 px-3 h-14"
        style={{ backgroundColor: "#0f1729", borderBottom: "1px solid #1e2d4a" }}
      >
        {/* Hamburger */}
        <button
          onClick={onMenuOpen}
          className="h-9 w-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors flex-shrink-0"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Gruppen-Dropdown */}
        <div className="relative" style={{ width: "140px" }}>
          <button
            onClick={() => { setDropdownOpen((v) => !v); setShowNotifs(false); }}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors w-full"
            style={{ backgroundColor: "#1a2535" }}
          >
            <div
              className="h-5 w-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
              style={{ backgroundColor: activeGroup ? groupColor(activeGroup.id) : "#3b82f6" }}
            >
              {activeGroup ? activeGroup.name[0].toUpperCase() : (displayName[0]?.toUpperCase() ?? "M")}
            </div>
            <span className="flex-1 text-left text-xs font-medium text-slate-200 truncate">
              {contextLabel}
            </span>
            <ChevronDown className={cn("h-4 w-4 text-slate-500 transition-transform flex-shrink-0", dropdownOpen && "rotate-180")} />
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
              <div
                className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden shadow-xl z-50"
                style={{ backgroundColor: "#1a2535", border: "1px solid #2d3f55" }}
              >
                <button
                  onClick={() => { setActiveGroup(null); setDropdownOpen(false); router.refresh(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-3 hover:bg-slate-700/50 transition-colors"
                >
                  <div className="h-6 w-6 rounded-full bg-brand-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                    {displayName[0]?.toUpperCase() ?? "M"}
                  </div>
                  <span className="flex-1 text-left text-sm text-slate-200">Meine Daten</span>
                  {!activeGroup && <Check className="h-3.5 w-3.5 text-brand-400" />}
                </button>
                {groups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => { setActiveGroup(group); setDropdownOpen(false); router.refresh(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-3 hover:bg-slate-700/50 transition-colors border-t border-slate-700/50"
                  >
                    <div
                      className="h-6 w-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                      style={{ backgroundColor: groupColor(group.id) }}
                    >
                      {group.name[0].toUpperCase()}
                    </div>
                    <span className="flex-1 text-left text-sm text-slate-200 truncate">{group.name}</span>
                    {activeGroup?.id === group.id && <Check className="h-3.5 w-3.5 text-brand-400" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Logo */}
<Link href="/dashboard" className="h-9 w-9 rounded-xl overflow-hidden ml-auto flex-shrink-0">
  <Image
    src="/icons/icon-192x192.png"
    alt="MaDe to find"
    width={36}
    height={36}
    className="h-full w-full object-cover"
  />
</Link>

        {/* Glocke – ganz rechts */}
        <button
          onClick={handleBellClick}
          className="relative h-9 w-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors flex-shrink-0"
        >
          <Bell className={cn("h-5 w-5", showNotifs && "text-brand-400")} />
          {unread > 0 && (
            <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-danger-500 text-white text-[9px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </header>

      {/* Benachrichtigungen Dropdown */}
      {showNotifs && (
        <div className="lg:hidden fixed inset-0 z-50" onClick={() => setShowNotifs(false)}>
          <div
            className="absolute top-14 right-3 w-80 rounded-2xl overflow-hidden shadow-2xl"
            style={{ backgroundColor: "#1a2535", border: "1px solid #2d3f55" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid #2d3f55" }}>
              <h3 className="text-sm font-semibold text-slate-100">Benachrichtigungen</h3>
              <button onClick={() => setShowNotifs(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
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
        </div>
      )}
    </>
  );
}
