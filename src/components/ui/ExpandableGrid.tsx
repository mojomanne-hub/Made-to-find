"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpandableGridProps<T> {
  items: T[];
  getKey: (item: T) => string;
  isSelected: (item: T) => boolean;
  renderItem: (item: T) => ReactNode;
  /** Zeilen im eingeklappten Zustand (Standard: 4) */
  rows?: number;
  /** Spalten – muss zu grid-cols-8 passen */
  cols?: number;
}

/**
 * Raster mit fester Spaltenzahl, das nur die ersten Zeilen zeigt
 * und per „Mehr anzeigen“ aufklappt. Ausgeklappt scrollt es in einem begrenzten Bereich.
 * Liegt die aktuelle Auswahl (z. B. durch den automatischen Vorschlag) im versteckten Teil,
 * klappt das Raster von selbst auf und scrollt zur Auswahl.
 */
export function ExpandableGrid<T>({
  items, getKey, isSelected, renderItem, rows = 4, cols = 8,
}: ExpandableGridProps<T>) {
  const limit = rows * cols;
  const selectedIndex = items.findIndex(isSelected);
  const hiddenCount = Math.max(0, items.length - limit);

  const [expanded, setExpanded] = useState(selectedIndex >= limit);
  const boxRef = useRef<HTMLDivElement>(null);

  // Auswahl wandert in den versteckten Bereich → aufklappen
  useEffect(() => {
    if (selectedIndex >= limit) setExpanded(true);
  }, [selectedIndex, limit]);

  // Ausgeklappt: Auswahl in den sichtbaren Bereich scrollen (nur wenn nötig)
  useEffect(() => {
    if (!expanded) return;
    const box = boxRef.current;
    const wrapper = box?.querySelector<HTMLElement>('[data-selected="true"]');
    const el = wrapper?.firstElementChild as HTMLElement | null; // Wrapper hat display:contents → eigentliches Feld nehmen
    if (!box || !el) return;
    const top = el.offsetTop;
    const bottom = top + el.offsetHeight;
    if (top < box.scrollTop || bottom > box.scrollTop + box.clientHeight) {
      box.scrollTop = Math.max(0, top - box.clientHeight / 2 + el.offsetHeight / 2);
    }
  }, [expanded, selectedIndex]);

  const visible = expanded || hiddenCount === 0 ? items : items.slice(0, limit);

  return (
    <div className="space-y-2">
      <div
        ref={boxRef}
        className={cn(expanded && hiddenCount > 0 && "overflow-y-auto pr-1")}
        style={{ position: "relative", ...(expanded && hiddenCount > 0 ? { maxHeight: "22rem" } : {}) }}
      >
        <div className="grid grid-cols-8 gap-1.5">
          {visible.map((item) => (
            <div key={getKey(item)} data-selected={isSelected(item) ? "true" : undefined} className="contents">
              {renderItem(item)}
            </div>
          ))}
        </div>
      </div>

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-600 py-2 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-400 hover:bg-slate-700 transition-colors"
        >
          {expanded ? (
            <><ChevronUp className="h-4 w-4" /> Weniger anzeigen</>
          ) : (
            <><ChevronDown className="h-4 w-4" /> Mehr anzeigen ({hiddenCount} weitere)</>
          )}
        </button>
      )}
    </div>
  );
}
