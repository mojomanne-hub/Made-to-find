import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Bestätigungs-Links aus E-Mails (z. B. „Passwort zurücksetzen“), wenn die E-Mail-Vorlage
 * auf diese Adresse zeigt: /auth/confirm?token_hash=…&type=recovery&next=/reset-password
 *
 * Vorteil gegenüber /auth/callback: funktioniert auch, wenn der Link in einem anderen Browser
 * oder einer anderen App geöffnet wird als der, in dem er angefordert wurde.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type      = searchParams.get("type") as EmailOtpType | null;
  const rawNext   = searchParams.get("next") ?? "/dashboard";
  const next      = /^\/(?!\/)[^\\]*$/.test(rawNext) ? rawNext : "/dashboard";

  if (tokenHash && type) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  if (type === "recovery" || next === "/reset-password") {
    return NextResponse.redirect(`${origin}/forgot-password?error=link`);
  }
  return NextResponse.redirect(`${origin}/login?error=link`);
}
