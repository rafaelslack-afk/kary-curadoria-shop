import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// GET /p/CON-0063 — link curto por referência (usado nas mensagens de
// WhatsApp do assistente). Redireciona para a página da peça.
export async function GET(request: NextRequest, { params }: { params: { ref: string } }) {
  const ref = decodeURIComponent(params.ref ?? "").trim().toUpperCase();
  const fallback = new URL("/produtos", request.url);
  if (!/^[A-Z0-9-]{2,20}$/.test(ref)) return NextResponse.redirect(fallback);

  const admin = createAdminClient();
  const { data } = await admin
    .from("products")
    .select("slug")
    .eq("sku_base", ref)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  return NextResponse.redirect(data?.slug ? new URL(`/produtos/${data.slug}`, request.url) : fallback);
}
