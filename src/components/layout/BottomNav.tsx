"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MapPin, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";

const NAV_ITEMS = [
  { href: ROUTES.dashboard, label: "Übersicht",   icon: LayoutDashboard },
  { href: ROUTES.locations, label: "Ablageorte",  icon: MapPin },
  { href: ROUTES.items,     label: "Gegenstände", icon: Package },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 pb-safe"
      style={{ backgroundColor: "#0f1729", borderTop: "1px solid #1e2d4a" }}
    >
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
      </div>
    </nav>
  );
}
