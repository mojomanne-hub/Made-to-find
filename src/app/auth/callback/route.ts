import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Nur Pfade innerhalb der eigenen App zulassen (kein Weiterleiten auf fremde Seiten)
  const rawNext = searchParams.get("next") ?? "/dashboard";
  const next = /^\/(?!\/)[^\\]*$/.test(rawNext) ? rawNext : "/dashboard";

  if (code) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Fehlgeschlagen -> zurück zum Login mit Hinweis
  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
