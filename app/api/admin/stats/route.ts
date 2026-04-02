import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/admin/stats
// KPIs para o dashboard admin
// Query params:
//   periodo=hoje | 7d | 30d  (default: 30d)

function startOf(periodo: string): string {
  const now = new Date();
  if (periodo === "hoje") {
    now.setHours(0, 0, 0, 0);
  } else if (periodo === "7d") {
    now.setDate(now.getDate() - 7);
    now.setHours(0, 0, 0, 0);
  } else {
    now.setDate(now.getDate() - 30);
    now.setHours(0, 0, 0, 0);
  }
  return now.toISOString();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const periodo = url.searchParams.get("periodo") ?? "30d";
  const desde = startOf(periodo);

  const admin = createAdminClient();

  // Executa consultas em paralelo
  const [ordersRes, stockRes, recentRes, topRes] = await Promise.all([
    // Receita + contagem de pedidos pagos no período
    admin
      .from("orders")
      .select("total")
      .eq("status", "paid")
      .gte("created_at", desde),

    // Alertas de estoque: variantes ativas onde stock_qty <= stock_min
    admin
      .from("product_variants")
      .select("id", { count: "exact", head: true })
      .eq("active", true)
      .filter("stock_qty", "lte", "stock_min"),

    // Últimos 5 pedidos (qualquer status)
    admin
      .from("orders")
      .select("id, order_number, guest_name, status, total, created_at, payment_method")
      .order("created_at", { ascending: false })
      .limit(5),

    // Top 5 produtos por quantidade vendida em 30d
    admin
      .from("order_items")
      .select("product_name, quantity, orders!inner(created_at, status)")
      .eq("orders.status", "paid")
      .gte("orders.created_at", startOf("30d")),
  ]);

  // Agrega receita e contagem
  const orders = ordersRes.data ?? [];
  const totalReceita = orders.reduce((s, o) => s + (o.total ?? 0), 0);
  const totalPedidos = orders.length;
  const ticketMedio = totalPedidos > 0 ? totalReceita / totalPedidos : 0;

  // Alertas de estoque
  const alertasEstoque = stockRes.count ?? 0;

  // Top produtos — agrupa manualmente
  const topMap: Record<string, number> = {};
  for (const item of topRes.data ?? []) {
    topMap[item.product_name] = (topMap[item.product_name] ?? 0) + item.quantity;
  }
  const topProdutos = Object.entries(topMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, qty]) => ({ name, qty }));

  return NextResponse.json(
    {
      periodo,
      totalReceita,
      totalPedidos,
      ticketMedio,
      alertasEstoque,
      pedidosRecentes: recentRes.data ?? [],
      topProdutos,
    },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );
}
