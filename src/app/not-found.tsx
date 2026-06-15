import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/lib/constants";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#111827" }}>
      <div className="text-center">
        <p className="text-7xl font-bold mb-2 leading-none" style={{ color: "#1e3a8a" }}>404</p>
        <h1 className="text-lg font-bold text-slate-200 mb-2">Seite nicht gefunden</h1>
        <p className="text-sm text-slate-500 mb-6">Die gesuchte Seite existiert nicht.</p>
        <Link href={ROUTES.dashboard}><Button>Zum Dashboard</Button></Link>
      </div>
    </div>
  );
}
