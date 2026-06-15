/**
 * Supabase-Middleware-Client.
 * Aktualisiert die Session bei jedem Request und schützt Routen.
 *
 * Geschützte Routen: /dashboard, /locations, /items, /search, /settings
 * Auth-Routen (nur unangemeldet): /login, /register, /forgot-password, /reset-password
 */

import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { Database } from "@/lib/types";

/** Routen, die eine gültige Session erfordern */
const PROTECTED = ["/dashboard", "/locations", "/items", "/search", "/settings", "/groups"];

/** Routen, die nur für nicht-eingeloggte Benutzer zugänglich sind */
const AUTH_ONLY = ["/login", "/register", "/forgot-password", "/reset-password"];

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          // Cookies sowohl in Request als auch Response setzen
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]),
          );
        },
      },
    },
  );

  // Wichtig: getUser() statt getSession() – validiert den JWT serverseitig
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Root → je nach Auth-Status weiterleiten
  if (path === "/") {
    return NextResponse.redirect(
      new URL(user ? "/dashboard" : "/login", request.url),
    );
  }

  // Nicht eingeloggt → geschützte Route → zum Login
  if (!user && PROTECTED.some(p => path.startsWith(p))) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", path); // Redirect nach Login merken
    return NextResponse.redirect(loginUrl);
  }

  // Eingeloggt → Auth-Route → zum Dashboard
  if (user && AUTH_ONLY.some(p => path.startsWith(p))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}
