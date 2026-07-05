import Link from "next/link";
import * as LucideIcons from "lucide-react";
import { ChevronRight, MapPin } from "lucide-react";
import { Card }       from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Badge";
import { Button }     from "@/components/ui/Button";
import { ROUTES }     from "@/lib/constants";
import { formatRelativeDate } from "@/lib/utils";

function DynIcon({ name, className }: { name: string | null; className?: string }) {
  const Icon = name
    ? (LucideIcons as unknown as Record<string, React.FC<{ className?: string }>>)[name]
    : null;
  const Comp = Icon ?? LucideIcons.Box;
  return <Comp className={className} />;
}

interface ItemWithLocation {
  id:          string;
  name:        string;
  description: string | null;
  quantity:    number;
  updated_at:  string;
  icon?:       string | null;
  image_url?:  string | null;
  color?:      string | null;   // ← NEU
  locations?:  { id: string; name: string; color: string | null } | null;
}

interface ItemListProps {
  items:         ItemWithLocation[];
  showLocation?: boolean;
}

export function ItemList({ items, showLocation = false }: ItemListProps) {
  if (items.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<LucideIcons.Package />}
          title="Noch keine Gegenstände"
          description="Füge deinen ersten Gegenstand hinzu."
          action={
            <Link href={ROUTES.itemNew}>
              <Button size="sm">
                <LucideIcons.Package className="h-4 w-4" /> Ersten Gegenstand erstellen
              </Button>
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <Link key={item.id} href={ROUTES.itemDetail(item.id)}>
          <Card hoverable>
            <div className="flex items-center gap-3">
              {/* Icon oder Foto */}
              <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
  style={{ backgroundColor: item.color ? item.color + "30" : "#334155" }}
>
  {item.image_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={item.image_url} alt="" className="h-full w-full object-cover" />
  ) : (
    <span style={{ color: item.color ?? "#94a3b8" }}>
      <DynIcon name={item.icon ?? null} className="h-[18px] w-[18px]" />
    </span>
  )}
</div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-100 truncate">{item.name}</p>
                {showLocation && item.locations && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 flex-shrink-0" style={{ color: item.locations.color ?? "#3b82f6" }} />
                    <span className="text-xs text-slate-500 truncate">{item.locations.name}</span>
                  </div>
                )}
                {item.description && !showLocation && (
                  <p className="text-xs text-slate-500 truncate mt-0.5">{item.description}</p>
                )}
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-medium text-slate-400">{item.quantity}×</p>
                  <p className="text-xs text-slate-600">{formatRelativeDate(item.updated_at)}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-600" />
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
