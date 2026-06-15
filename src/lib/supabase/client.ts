/**
 * Supabase-Client für Client Components (Browser).
 *
 * HINWEIS: Wir verwenden hier absichtlich keinen Database-Typ-Parameter,
 * da die lokale Typdefinition ohne `supabase gen types` nicht 100% mit
 * dem tatsächlichen Schema übereinstimmt und zu `never`-Fehlern führt.
 * Stattdessen werden die Typen in den Komponenten explizit gesetzt.
 */

import { createBrowserClient as _create } from "@supabase/ssr";

export function createBrowserClient() {
  return _create(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
