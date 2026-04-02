import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAID = ["paid", "preparing", "shipped", "delivered"];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const start = searchParams.get("start_date");
  const end   = searchParams.get("end_date");
  const topN  = parseInt(searchParams.get("top_n") ?? "10", 10);

  const admin = createAdminClient();

  // Fetch paid orders in the period
  let orderQuery = admin
    .from("orders")
    .select("id")
    .in("status", PAID);
  if (start) orderQuery = orderQuery.gte("created_at", start);
  if (end)   orderQuery = orderQuery.lte("created_at", end + "T23:59:59.999Z");

  const { data: periodOrders } = await orderQuery;
  const orderIds = (periodOrders ?? []).map((o) => o.id as string);

  if (orderIds.length === 0) {
    return NextResponse.json({ top_products: [] });
  }

  // Fetch order_items for those orders
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: itemsRaw, error } = await admin
    .from("order_items")
    .select("product_name, sku_snapshot, color_snapshot, size_snapshot, quantity, total_price, order_id")
    .in("order_id", orderIds);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = itemsRaw as any[];

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Group by product_name
  const productMap = new Map<string, {
    product_name: string; sku_base: string;
    total_qty: number; total_revenue: number;
    variants: Map<string, { color: string | null; size: string; qty: number }>;
  }>();

  for (const item of items ?? []) {
    const key = (item.product_name as string);
    if (!productMap.has(key)) {
      productMap.set(key, {
        product_name:  key,
        sku_base:      item.sku_snapshot?.split("-").slice(0, 2).join("-") ?? "—",
        total_qty:     0,
        total_revenue: 0,
        variants:      new Map(),
      });
    }
    const p = productMap.get(key)!;
    p.total_qty     += item.quantity ?? 0;
    p.total_revenue += item.total_price ?? 0;

    const vKey = `${item.color_snapshot ?? ""}|${item.size_snapshot}`;
    const cur  = p.variants.get(vKey) ?? {
      color: item.color_snapshot as string | null,
      size:  item.size_snapshot as string,
      qty:   0,
    };
    cur.qty += item.quantity ?? 0;
    p.variants.set(vKey, cur);
  }

  const sorted = Array.from(productMap.values())
    .sort((a, b) => b.total_qty - a.total_qty)
    .slice(0, topN)
    .map((p) => ({
      ...p,
      variants: Array.from(p.variants.values()).sort((a, b) => b.qty - a.qty),
    }));

  return NextResponse.json({ top_products: sorted });
}
