"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, MapPin, Package,
  Search, Settings, LogOut, Users,
  ChevronDown, Check, Share2, Edit2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createBrowserClient } from "@/lib/supabase/client";
import { useGroup, GroupProvider, type Group } from "@/lib/context/GroupContext";
import { ROUTES } from "@/lib/constants";
import type { User } from "@supabase/supabase-js";
import { SharedAccessModal } from "@/components/groups/SharedAccessModal";

const NAV_ITEMS = [
  { href: ROUTES.dashboard, label: "Übersicht",   icon: LayoutDashboard },
  { href: ROUTES.locations, label: "Ablageorte",  icon: MapPin },
  { href: ROUTES.items,     label: "Gegenstände", icon: Package },
  { href: ROUTES.search,    label: "Suche",       icon: Search },
];

// Zufällige Farbe für Gruppen-Avatare
const GROUP_COLORS = [
  "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899",
];
function groupColor(id: string) {
  let hash = 0;
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return GROUP_COLORS[Math.abs(hash) % GROUP_COLORS.length];
}

interface SidebarProps {
  user:        User;
  groups:      Group[];
  displayName: string;
}

function SidebarInner({ user, groups, displayName: propDisplayName }: SidebarProps) {
  const pathname         = usePathname();
  const router           = useRouter();
  const { activeGroup, setActiveGroup, setGroups } = useGroup();
  const [dropdownOpen,   setDropdownOpen]   = useState(false);
  const [sharingModal,   setSharingModal]   = useState(false);
  const [shareTarget,    setShareTarget]    = useState<Group | null>(null);
  const [manageTarget,   setManageTarget]   = useState<Group | null>(null);

  // Gruppen in Context laden
  useEffect(() => { setGroups(groups); }, [groups, setGroups]);

  // Gespeicherte Gruppe validieren (existiert sie noch?)
  useEffect(() => {
    if (activeGroup && !groups.find((g) => g.id === activeGroup.id)) {
      setActiveGroup(null);
    }
  }, [groups, activeGroup, setActiveGroup]);

  async function handleLogout() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push(ROUTES.login);
    router.refresh();
  }

  const displayName = propDisplayName || user.email?.split("@")[0] || "Benutzer";
  const contextLabel = activeGroup ? activeGroup.name : "Meine Daten";

  return (
    <>
      <aside className="hidden lg:flex flex-col w-64 min-h-screen sticky top-0 flex-shrink-0"
        style={{ backgroundColor: "#0f1729", borderRight: "1px solid #1e2d4a" }}>

        {/* Logo */}
        <div className="px-4 py-5" style={{ borderBottom: "1px solid #1e2d4a" }}>
          <Link href={ROUTES.dashboard} className="flex items-center gap-3 group">
            <div className="h-9 w-9 rounded-xl bg-brand-600 flex items-center justify-center shadow-md">
              <Search className="h-[18px] w-[18px] text-white" />
            </div>
            <div>
              <span className="block text-sm font-bold text-white tracking-tight">MaDe to find</span>
              <span className="block text-[10px] tracking-widest uppercase" style={{ color: "#64748b" }}>
                Alles im Blick
              </span>
            </div>
          </Link>
        </div>

        {/* Kontext-Dropdown (Meine Daten / Gruppen) */}
        <div className="px-3 pt-3">
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors hover:bg-[#1a2540]"
          >
            {/* Avatar */}
            <div
              className="h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[10px] font-bold"
              style={{ backgroundColor: activeGroup ? groupColor(activeGroup.id) : "#3b82f6" }}
            >
              {activeGroup
                ? activeGroup.name[0].toUpperCase()
                : displayName[0].toUpperCase()}
            </div>
            <span className="flex-1 text-left text-sm font-medium text-slate-200 truncate">
              {contextLabel}
            </span>
            <ChevronDown className={cn("h-4 w-4 text-slate-500 transition-transform", dropdownOpen && "rotate-180")} />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="mt-1 mx-0 rounded-xl overflow-hidden border border-slate-700 shadow-xl z-50"
              style={{ backgroundColor: "#1a2535" }}>

              {/* Meine Daten */}
              <button
                onClick={() => { setActiveGroup(null); setDropdownOpen(false); router.refresh(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-700/50 transition-colors"
              >
                <div className="h-6 w-6 rounded-full bg-brand-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                  {displayName[0].toUpperCase()}
                </div>
                <span className="flex-1 text-left text-sm text-slate-200">Meine Daten</span>
                {!activeGroup && <Check className="h-3.5 w-3.5 text-brand-400 flex-shrink-0" />}
              </button>

              {/* Gruppen */}
              {groups.map((group) => (
                <div key={group.id} className="flex items-center">
                  <button
                    onClick={() => { setActiveGroup(group); setDropdownOpen(false); router.refresh(); }}
                    className="flex-1 flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-700/50 transition-colors"
                  >
                    <div
                      className="h-6 w-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                      style={{ backgroundColor: groupColor(group.id) }}
                    >
                      {group.name[0].toUpperCase()}
                    </div>
                    <span className="flex-1 text-left text-sm text-slate-200 truncate">{group.name}</span>
                    {activeGroup?.id === group.id && (
                      <Check className="h-3.5 w-3.5 text-brand-400 flex-shrink-0" />
                    )}
                  </button>
                  {/* Bearbeiten-Button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setManageTarget(group); setSharingModal(true); setDropdownOpen(false); }}
                    className="p-2 text-slate-500 hover:text-slate-300 transition-colors"
                    title="Gruppe bearbeiten"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  {/* Share-Button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setShareTarget(group); setSharingModal(true); setDropdownOpen(false); }}
                    className="p-2 text-slate-500 hover:text-slate-300 transition-colors"
                    title="Gruppe teilen"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              {/* Trennlinie + Geteilter Zugriff */}
              <div style={{ borderTop: "1px solid #2d3f55" }}>
                <button
                  onClick={() => { setSharingModal(true); setShareTarget(null); setDropdownOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-700/50 transition-colors"
                >
                  <Users className="h-4 w-4 text-slate-500" />
                  <span className="text-sm text-slate-400">Geteilter Zugriff</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          <p className="px-3 mb-2 text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#64748b" }}>
            Navigation
          </p>
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive =
              pathname === href || (href !== ROUTES.dashboard && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  isActive
                    ? "text-white"
                    : "text-slate-400 hover:text-white hover:bg-[#1a2540]"
                )}
                style={isActive ? { backgroundColor: "#1e3a6e" } : {}}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-2 py-3 space-y-0.5" style={{ borderTop: "1px solid #1e2d4a" }}>
          <Link
            href={ROUTES.settings}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
              pathname === ROUTES.settings
                ? "text-white bg-[#1e3a6e]"
                : "text-slate-400 hover:text-white hover:bg-[#1a2540]"
            )}
          >
            <Settings className="h-4 w-4 flex-shrink-0" />
            Einstellungen
          </Link>

          {/* Geteilter Zugriff Button */}
          <button
            onClick={() => { setSharingModal(true); setShareTarget(null); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-[#1a2540] transition-all"
          >
            <Users className="h-4 w-4 flex-shrink-0" />
            Geteilter Zugriff
          </button>

          {/* Benutzer-Info */}
          <div className="px-3 py-2">
            <p className="text-xs font-semibold text-white truncate">{displayName}</p>
            <p className="text-[11px] truncate" style={{ color: "#64748b" }}>{user.email}</p>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ color: "#64748b" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.backgroundColor = "rgba(220,38,38,0.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#64748b"; e.currentTarget.style.backgroundColor = ""; }}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            Abmelden
          </button>
        </div>
      </aside>

      {/* Geteilter Zugriff Modal */}
      <SharedAccessModal
        isOpen={sharingModal}
        onClose={() => { setSharingModal(false); setShareTarget(null); setManageTarget(null); }}
        initialGroup={shareTarget}
        initialManageGroup={manageTarget}
        groups={groups}
        onGroupsChange={setGroups}
        userId={user.id}
      />
    </>
  );
}

// Wrapper der den Context nutzt
export function Sidebar({ user, groups, displayName }: SidebarProps) {
  return <SidebarInner user={user} groups={groups} displayName={displayName} />;
}
