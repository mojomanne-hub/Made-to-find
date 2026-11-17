/**
 * Supabase-Client für Server Components, Route Handlers und Server Actions.
 */

import { createServerClient as _create } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

export async function createServerClient() {
  const cookieStore = await cookies();

  return _create(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Partial<ResponseCookie> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Kein Problem in Server Components – Middleware übernimmt das
          }
        },
      },
    },
  );
}

/**
 * Angemeldeter Nutzer – pro Seitenaufruf nur EINMAL beim Supabase-Server nachgefragt,
 * auch wenn Layout und Seite ihn beide brauchen (spart eine Anfrage pro Seitenwechsel).
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});
