import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { lookupBarcode } from "@/lib/utils/barcode-lookup";

/** Fragt die offenen Produktdatenbanken nach einem Strichcode (nur für angemeldete Nutzer) */
export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });

  const code = (new URL(req.url).searchParams.get("code") ?? "").trim();
  if (!/^\d{8,14}$/.test(code)) return NextResponse.json({ product: null });

  const product = await lookupBarcode(code);
  return NextResponse.json({ product });
}
