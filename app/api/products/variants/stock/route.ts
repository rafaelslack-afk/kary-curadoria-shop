import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/products/variants/stock?ids=id1,id2,id3
// Retorna stock_qty atual de cada variante.

export async function GET(request: NextRequest) {
  const ids = request.nextUrl.searchParams.get("ids");
  if (!ids?.trim()) {
    return NextResponse.json([], { headers: { "Cache-Control": "no-store" } });
  }

  const variantIds = ids.split(",").map((id) => id.trim()).filter(Boolean);
  if (variantIds.length === 0) {
    return NextResponse.json([], { headers: { "Cache-Control": "no-store" } });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("product_variants")
    .select("id, stock_qty")
    .in("id", variantIds);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? [], { headers: { "Cache-Control": "no-store" } });
}
