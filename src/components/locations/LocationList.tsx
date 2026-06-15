import Link from "next/link";
import * as LucideIcons from "lucide-react";
import { ChevronRight, Package } from "lucide-react";
import { Card }       from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Badge";
import { Button }     from "@/components/ui/Button";
import { ROUTES }     from "@/lib/constants";
import { formatRelativeDate } from "@/lib/utils";

function DynIcon({ name, className }: { name: string | null; className?: string }) {
  const Icon = name
    ? (LucideIcons as unknown as Record<string, React.FC<{ className?: string }>>)[name]
    : null;
  const Fallback = LucideIcons.MapPin;
  const Comp = Icon ?? Fallback;
  return <Comp className={className} />;
}

interface LocationWithCount {
  id:          string;
  name:        string;
  description: string | null;
  color:       string | null;
  icon:        string | null;
  image_url:   string | null;
  updated_at:  string;
  items:       { count: number }[];
}

export function LocationList({ locations }: { locations: LocationWithCount[] }) {
  if (locations.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<LucideIcons.MapPin />}
          title="Noch keine Ablageorte vorhanden"
          description="Erstelle deinen ersten Ablageort, um mit der Organisation deiner Gegenstände zu beginnen."
          action={
            <Link href={ROUTES.locationNew}>
              <Button size="sm"><LucideIcons.MapPin className="h-4 w-4" /> Ersten Ablageort erstellen</Button>
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {locations.map((location) => {
        const itemCount = location.items?.[0]?.count ?? 0;
        const color     = location.color ?? "#3b82f6";

        return (
          <Link key={location.id} href={ROUTES.locationDetail(location.id)}>
            <Card hoverable>
              <div className="flex items-center gap-3">
                {/* Icon oder Foto */}
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                  style={{ backgroundColor: color + "25" }}
                >
                  {location.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={location.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span style={{ color }}><DynIcon name={location.icon} className="h-[18px] w-[18px]" /></span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-100 truncate">{location.name}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {location.description ?? "Keine Beschreibung"}
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="hidden sm:flex items-center gap-1 text-xs text-slate-500">
                    <Package className="h-3.5 w-3.5" />
                    <span>{itemCount}</span>
                  </div>
                  <span className="hidden sm:block text-xs text-slate-600">
                    {formatRelativeDate(location.updated_at)}
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-600" />
                </div>
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
