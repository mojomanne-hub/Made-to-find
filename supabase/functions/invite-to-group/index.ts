// supabase/functions/invite-to-group/index.ts
//
// Sendet Gruppeneinladungen per E-Mail via Resend.
// - Registrierter User:     Einladungslink direkt
// - Nicht registrierter User: Einladungslink + Hinweis zur Registrierung

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Auth prüfen ──────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Nicht autorisiert" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Eingabe lesen ────────────────────────────────────────
    const { email, group_id } = await req.json() as { email: string; group_id: string };
    if (!email || !group_id) {
      return new Response(JSON.stringify({ error: "E-Mail und Gruppe erforderlich" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Supabase Clients ─────────────────────────────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey     = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey  = Deno.env.get("SERVICE_ROLE_KEY")!;
    const resendKey   = Deno.env.get("RESEND_API_KEY")!;
    const appUrl      = Deno.env.get("APP_URL") ?? "http://localhost:3000";

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── Einladenden prüfen ───────────────────────────────────
    const { data: { user: inviter } } = await userClient.auth.getUser();
    if (!inviter) {
      return new Response(JSON.stringify({ error: "Nicht eingeloggt" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: membership } = await userClient
      .from("group_members")
      .select("group_id")
      .eq("group_id", group_id)
      .eq("user_id", inviter.id)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Kein Zugriff auf diese Gruppe" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Gruppe laden ─────────────────────────────────────────
    const { data: group } = await adminClient
      .from("groups")
      .select("id, name, invite_token")
      .eq("id", group_id)
      .single();

    if (!group) {
      return new Response(JSON.stringify({ error: "Gruppe nicht gefunden" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Einladungslink ───────────────────────────────────────
    const joinUrl     = `${appUrl}/join/${group.invite_token}`;
    const inviterName = inviter.email?.split("@")[0] ?? "Jemand";

    // ── Prüfen ob bereits registriert ────────────────────────
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id")
      .ilike("email", email.trim())
      .maybeSingle();

    // ── E-Mail via Resend senden ─────────────────────────────
    const emailHtml = existingProfile
      ? /* Registrierter User */ `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <div style="background: #1a2535; border-radius: 16px; padding: 32px; text-align: center;">
            <h1 style="color: #e2e8f0; font-size: 22px; margin-bottom: 8px;">
              Du wurdest eingeladen! 🎉
            </h1>
            <p style="color: #94a3b8; font-size: 15px; margin-bottom: 24px;">
              <strong style="color: #60a5fa;">${inviterName}</strong> lädt dich ein,
              der Gruppe <strong style="color: #e2e8f0;">"${group.name}"</strong>
              auf MaDe to find beizutreten.
            </p>
            <a href="${joinUrl}"
               style="display: inline-block; background: #2563eb; color: white;
                      padding: 14px 32px; border-radius: 12px; text-decoration: none;
                      font-weight: 600; font-size: 15px;">
              Einladung annehmen
            </a>
            <p style="color: #64748b; font-size: 12px; margin-top: 24px;">
              Melde dich mit deinem bestehenden Konto an um beizutreten.
            </p>
          </div>
        </div>`
      : /* Neuer User */ `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <div style="background: #1a2535; border-radius: 16px; padding: 32px; text-align: center;">
            <h1 style="color: #e2e8f0; font-size: 22px; margin-bottom: 8px;">
              Du wurdest eingeladen! 🎉
            </h1>
            <p style="color: #94a3b8; font-size: 15px; margin-bottom: 8px;">
              <strong style="color: #60a5fa;">${inviterName}</strong> lädt dich ein,
              der Gruppe <strong style="color: #e2e8f0;">"${group.name}"</strong>
              auf MaDe to find beizutreten.
            </p>
            <p style="color: #94a3b8; font-size: 14px; margin-bottom: 24px;">
              MaDe to find hilft dir, deine Gegenstände und Ablageorte zu verwalten
              und mit Familie oder Freunden zu teilen.
            </p>
            <a href="${joinUrl}"
               style="display: inline-block; background: #2563eb; color: white;
                      padding: 14px 32px; border-radius: 12px; text-decoration: none;
                      font-weight: 600; font-size: 15px;">
              Jetzt registrieren & beitreten
            </a>
            <p style="color: #64748b; font-size: 12px; margin-top: 24px;">
              Erstelle ein kostenloses Konto um der Gruppe beizutreten.
            </p>
          </div>
        </div>`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        from:    "MaDe to find <onboarding@resend.dev>",
        to:      [email.trim()],
        subject: `${inviterName} lädt dich zur Gruppe "${group.name}" ein`,
        html:    emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const resendError = await resendResponse.json();
      console.error("Resend Fehler:", resendError);
      throw new Error(`E-Mail konnte nicht gesendet werden: ${JSON.stringify(resendError)}`);
    }

    console.log(`Einladung gesendet an ${email} für Gruppe ${group.name}`);

    return new Response(
      JSON.stringify({
        success:    true,
        registered: !!existingProfile,
        message:    `Einladung wurde an ${email} gesendet.`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Edge Function Fehler:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unbekannter Fehler" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
