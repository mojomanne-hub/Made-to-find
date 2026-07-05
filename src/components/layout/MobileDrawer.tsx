"use client";

/**
 * MobileDrawer – Slide-in Sidebar für Mobile.
 * Öffnet sich von links, enthält Navigation, Benutzerinfo,
 * Gruppen-Management, Geteilter Zugriff und Abmelden.
 */

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, MapPin, Package,
  LogOut, Users, X, Share2, Edit2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createBrowserClient }    from "@/lib/supabase/client";
import { useGroup, type Group }   from "@/lib/context/GroupContext";
import { ROUTES }                 from "@/lib/constants";
import type { User }              from "@supabase/supabase-js";
import { SharedAccessModal }      from "@/components/groups/SharedAccessModal";
import { useState }               from "react";

const NAV_ITEMS = [
  { href: ROUTES.dashboard, label: "Übersicht",   icon: LayoutDashboard },
  { href: ROUTES.locations, label: "Ablageorte",  icon: MapPin },
  { href: ROUTES.items,     label: "Gegenstände", icon: Package },
];

const GROUP_COLORS = [
  "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899",
];
function groupColor(id: string) {
  let hash = 0;
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return GROUP_COLORS[Math.abs(hash) % GROUP_COLORS.length];
}

interface MobileDrawerProps {
  isOpen:      boolean;
  onClose:     () => void;
  user:        User;
  groups:      Group[];
  displayName: string;
}

export function MobileDrawer({ isOpen, onClose, user, groups, displayName }: MobileDrawerProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const { setGroups } = useGroup();
  const [sharingModal, setSharingModal] = useState(false);
  const [shareTarget,  setShareTarget]  = useState<Group | null>(null);
  const [manageTarget, setManageTarget] = useState<Group | null>(null);

  // Body scroll sperren wenn offen
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Schließen bei Route-Wechsel
  useEffect(() => { onClose(); }, [pathname]);

  async function handleLogout() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push(ROUTES.login);
    router.refresh();
  }

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "lg:hidden fixed top-0 left-0 bottom-0 z-50 w-72 flex flex-col transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ backgroundColor: "#0f1729", borderRight: "1px solid #1e2d4a" }}
      >
        {/* Header mit Logo + Schließen */}
        <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: "1px solid #1e2d4a" }}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl overflow-hidden">
              <Image src="/icons/icon-192x192.png" alt="MaDe to find" width={40} height={40} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">MaDe to find</p>
              <p className="text-[10px] tracking-widest uppercase" style={{ color: "#64748b" }}>Alles im Blick</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <div className="px-3 py-4" style={{ borderBottom: "1px solid #1e2d4a" }}>
          <p className="px-3 mb-2 text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#64748b" }}>
            Navigation
          </p>
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== ROUTES.dashboard && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all mb-0.5",
                  isActive ? "text-white" : "text-slate-400 hover:text-white hover:bg-[#1a2540]"
                )}
                style={isActive ? { backgroundColor: "#1e3a6e" } : {}}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </div>

        {/* Benutzerinfo */}
        <div className="px-4 py-4" style={{ borderBottom: "1px solid #1e2d4a" }}>
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ backgroundColor: "#3b82f6" }}
            >
              {(displayName || user.email || "?")[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {displayName || user.email?.split("@")[0]}
              </p>
              <p className="text-xs truncate" style={{ color: "#64748b" }}>{user.email}</p>
            </div>
          </div>
        </div>

        {/* Gruppen */}
        {groups.length > 0 && (
          <div className="px-3 py-3" style={{ borderBottom: "1px solid #1e2d4a" }}>
            <p className="px-3 mb-2 text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#64748b" }}>
              Gruppen
            </p>
            {groups.map((group) => (
              <div key={group.id} className="flex items-center gap-1 mb-0.5">
                <div className="flex-1 flex items-center gap-2.5 px-3 py-2 rounded-xl">
                  <div
                    className="h-5 w-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                    style={{ backgroundColor: groupColor(group.id) }}
                  >
                    {group.name[0].toUpperCase()}
                  </div>
                  <span className="text-sm text-slate-300 truncate">{group.name}</span>
                </div>
                <button
                  onClick={() => { setManageTarget(group); setSharingModal(true); }}
                  className="p-2 text-slate-500 hover:text-slate-300 transition-colors"
                  title="Bearbeiten"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => { setShareTarget(group); setSharingModal(true); }}
                  className="p-2 text-slate-500 hover:text-slate-300 transition-colors"
                  title="Teilen"
                >
                  <Share2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="px-3 py-3 mt-auto space-y-0.5">
          {/* Geteilter Zugriff */}
          <button
            onClick={() => { setSharingModal(true); setShareTarget(null); setManageTarget(null); }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-[#1a2540] transition-all"
          >
            <Users className="h-4 w-4 flex-shrink-0" />
            Geteilter Zugriff
          </button>

          {/* Einstellungen */}
          <Link
            href={ROUTES.settings}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-[#1a2540] transition-all"
          >
            <Package className="h-4 w-4 flex-shrink-0" />
            Einstellungen
          </Link>

          {/* Abmelden */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-danger-400 hover:bg-danger-900/20 transition-all"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            Abmelden
          </button>
        </div>
      </div>

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
