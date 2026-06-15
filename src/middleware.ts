/**
 * Next.js Middleware
 * Läuft bei jedem Request – aktualisiert Supabase-Session und schützt Routen.
 */

import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Alle Pfade außer:
     * - _next/static  (statische Assets)
     * - _next/image   (Bildoptimierung)
     * - favicon.ico, icons/, *.png/svg/jpg/webp (öffentliche Dateien)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|icons/|.*\\.(?:png|svg|jpg|jpeg|webp)$).*)",
  ],
};
