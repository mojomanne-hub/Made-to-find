import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

/** Holt Produktfotos von den offenen Datenbanken (nur eingeloggt, nur bekannte Hosts) */
const ALLOWED = /^https:\/\/images\.open(food|products|beauty)facts\.org\//;

export async function GET(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const url = new URL(req.url).searchParams.get("url") ?? "";
  if (!ALLOWED.test(url)) return new NextResponse("Bad request", { status: 400 });

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return new NextResponse("Not found", { status: 404 });
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 2_000_000) return new NextResponse("Too large", { status: 413 });
    return new NextResponse(buf, {
      headers: { "Content-Type": res.headers.get("content-type") ?? "image/jpeg", "Cache-Control": "private, max-age=3600" },
    });
  } catch {
    return new NextResponse("Upstream error", { status: 502 });
  }
}
