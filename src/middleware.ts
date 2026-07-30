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
    "/((?!_next/static|_next/image|favicon\\.ico|icons/|join/|.*\\.(?:png|svg|jpg|jpeg|webp)$).*)",
  ],
};