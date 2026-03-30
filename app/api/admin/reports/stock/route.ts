import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PAID = ["paid", "preparing", "shipped", "delivered"];

export async function GET() {
  const admin = createAdminClient();

  // All active variants with product name
  const { data: variants, error: varErr } = await admin
    .from("product_variants")
    .select("id, sku, size, color, stock_qty, stock_min, products!inner(name)")
    .eq("active", true)
    .order("stock_qty", { ascending: true });

  if (varErr) {
    return NextResponse.json({ error: varErr.message }, { status: 500 });
  }

  // Items sold in last 30 days from paid orders
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: recentOrders } = await admin
    .from("orders")
    .select("id")
    .in("status", PAID)
    .gte("created_at", since);

  const orderIds = (recentOrders ?? []).map((o) => o.id as string);

  // Qty sold per variant_id in last 30d
  const sold30Map = new Map<string, number>();
  if (orderIds.length > 0) {
    const { data: items } = await admin
      .from("order_items")
      .select("variant_id, quantity")
      .in("order_id", orderIds);

    for (const item of items ?? []) {
      if (!item.variant_id) continue;
      sold30Map.set(
        item.variant_id as string,
        (sold30Map.get(item.variant_id as string) ?? 0) + (item.quantity as number)
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stock_vs_sales = (variants ?? []).map((v: any) => {
    const product_name = Array.isArray(v.products)
      ? v.products[0]?.name ?? "—"
      : v.products?.name ?? "—";
    const sold_30d = sold30Map.get(v.id as string) ?? 0;
    const status =
      v.stock_qty === 0
        ? "zero"
        : v.stock_qty <= v.stock_min
        ? "low"
        : "ok";

    return {
      product_name,
      color:    v.color   ?? null,
      size:     v.size,
      sku:      v.sku,
      stock_qty: v.stock_qty,
      stock_min: v.stock_min,
      sold_30d,
      status,
    };
  });

  return NextResponse.json({ stock_vs_sales });
}
