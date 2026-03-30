import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// GET /api/admin/sku/next?prefix=LIN
// Retorna o próximo código base sequencial para o prefixo da categoria
export async function GET(request: NextRequest) {
  const prefix = request.nextUrl.searchParams.get("prefix")?.trim().toUpperCase();

  if (!prefix) {
    return NextResponse.json({ error: "Parâmetro 'prefix' obrigatório." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data } = await admin
    .from("products")
    .select("sku_base")
    .ilike("sku_base", `${prefix}-%`)
    .order("sku_base", { ascending: false })
    .limit(1);

  let nextNum = 1;
  if (data && data.length > 0 && data[0].sku_base) {
    const parts = data[0].sku_base.split("-");
    const lastNum = parseInt(parts[parts.length - 1] ?? "0", 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  const skuBase = `${prefix}-${String(nextNum).padStart(4, "0")}`;

  return NextResponse.json({ skuBase });
}
