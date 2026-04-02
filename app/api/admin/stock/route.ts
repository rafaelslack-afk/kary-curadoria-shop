import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/stock
// Retorna todas as variantes com nome do produto, para a página de estoque.

export async function GET() {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("product_variants")
    .select(`
      id,
      product_id,
      sku,
      size,
      color,
      stock_qty,
      stock_min,
      active,
      products!inner ( name )
    `)
    .order("stock_qty", { ascending: true });

  if (error) {
    console.error("[admin/stock GET] erro:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = (data ?? []).map((row: any) => ({
    id: row.id,
    product_id: row.product_id,
    sku: row.sku,
    size: row.size,
    color: row.color,
    stock_qty: row.stock_qty,
    stock_min: row.stock_min,
    active: row.active,
    product_name: Array.isArray(row.products) ? row.products[0]?.name ?? "—" : row.products?.name ?? "—",
  }));

  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
