"use client";

/**
 * DashboardLists – Client Component für die letzten Aktivitäten.
 * Muss Client sein wegen Hover-Interaktionen auf den Links.
 */

import Link from "next/link";
import { MapPin, Package, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ROUTES } from "@/lib/constants";
import { formatRelativeDate } from "@/lib/utils";

interface RecentLocation {
  id:         string;
  name:       string;
  color:      string | null;
  updated_at: string;
}

interface RecentItem {
  id:         string;
  name:       string;
  quantity:   number;
  updated_at: string;
  locations:  { name: string } | null;
}

interface DashboardListsProps {
  recentLocations: RecentLocation[];
  recentItems:     RecentItem[];
}

export function DashboardLists({ recentLocations, recentItems }: DashboardListsProps) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {/* Letzte Ablageorte */}
      <Card padding="none">
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid #2d3f55" }}
        >
          <h2 className="text-sm font-semibold text-slate-200">Letzte Ablageorte</h2>
          <Link
            href={ROUTES.locations}
            className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
          >
            Alle <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {!recentLocations.length ? (
          <p className="px-4 py-6 text-sm text-slate-500 text-center">
            Noch keine Ablageorte
          </p>
        ) : (
          <ul>
            {recentLocations.map((loc) => (
              <li key={loc.id} style={{ borderBottom: "1px solid #1a2535" }}>
                <Link
                  href={ROUTES.locationDetail(loc.id)}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#243247]"
                >
                  <div
                    className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: (loc.color ?? "#3b82f6") + "30" }}
                  >
                    <MapPin className="h-3.5 w-3.5" style={{ color: loc.color ?? "#3b82f6" }} />
                  </div>
                  <span className="text-sm font-medium text-slate-200 flex-1 truncate">
                    {loc.name}
                  </span>
                  <span className="text-xs text-slate-500 flex-shrink-0">
                    {formatRelativeDate(loc.updated_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Letzte Gegenstände */}
      <Card padding="none">
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid #2d3f55" }}
        >
          <h2 className="text-sm font-semibold text-slate-200">Letzte Gegenstände</h2>
          <Link
            href={ROUTES.items}
            className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
          >
            Alle <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {!recentItems.length ? (
          <p className="px-4 py-6 text-sm text-slate-500 text-center">
            Noch keine Gegenstände
          </p>
        ) : (
          <ul>
            {recentItems.map((item) => (
              <li key={item.id} style={{ borderBottom: "1px solid #1a2535" }}>
                <Link
                  href={ROUTES.itemDetail(item.id)}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#243247]"
                >
                  <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-slate-700">
                    <Package className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{item.name}</p>
                    <p className="text-xs text-slate-500 truncate">{item.locations?.name ?? "–"}</p>
                  </div>
                  <span className="text-xs text-slate-500 flex-shrink-0">
                    {formatRelativeDate(item.updated_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
