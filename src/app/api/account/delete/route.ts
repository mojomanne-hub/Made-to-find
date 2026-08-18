import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "Server nicht konfiguriert (Service Role Key fehlt)." },
      { status: 500 }
    );
  }

  // Admin-Client mit Service Role Key (umgeht RLS, kann Auth-User löschen)
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Token verifizieren -> User-ID ermitteln
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) {
    return NextResponse.json({ error: "Ungültige Sitzung." }, { status: 401 });
  }

  const userId = userData.user.id;

  try {
    // 1) Fotos aus Storage löschen (item-images + location-images)
    for (const bucket of ["item-images", "location-images"]) {
      const { data: files } = await supabaseAdmin.storage.from(bucket).list(userId);
      if (files && files.length > 0) {
        const paths = files.map((f) => `${userId}/${f.name}`);
        await supabaseAdmin.storage.from(bucket).remove(paths);
      }
    }

    // 2) Items löschen
    await supabaseAdmin.from("items").delete().eq("user_id", userId);

    // 3) Locations löschen
    await supabaseAdmin.from("locations").delete().eq("user_id", userId);

    // 4) Profil löschen
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    // 5) Auth-User löschen (muss zuletzt passieren)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Account-Löschung fehlgeschlagen:", err);
    return NextResponse.json(
      { error: "Löschen fehlgeschlagen. Bitte versuche es erneut." },
      { status: 500 }
    );
  }
}
