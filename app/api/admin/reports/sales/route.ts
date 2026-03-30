import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PAID = ["paid", "preparing", "shipped", "delivered"];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const start  = searchParams.get("start_date");
  const end    = searchParams.get("end_date");
  const status = searchParams.get("status");   // comma-separated or single

  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = admin
    .from("orders")
    .select("id, order_number, status, payment_method, total, created_at, guest_name, guest_email");

  // Status filter
  const statuses = status
    ? status.split(",").map((s) => s.trim())
    : PAID;
  query = query.in("status", statuses);

  if (start) query = query.gte("created_at", start);
  if (end)   query = query.lte("created_at", end + "T23:59:59.999Z");

  query = query.order("created_at", { ascending: true });

  const { data: ordersRaw, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = ordersRaw ?? [];

  // KPIs
  const total_revenue = rows.reduce((s, o) => s + (o.total ?? 0), 0);
  const total_orders  = rows.length;
  const ticket_medio  = total_orders > 0 ? total_revenue / total_orders : 0;

  // Revenue by day
  const byDay = new Map<string, { revenue: number; orders: number }>();
  for (const o of rows) {
    const day = (o.created_at as string).slice(0, 10);
    const cur = byDay.get(day) ?? { revenue: 0, orders: 0 };
    cur.revenue += o.total ?? 0;
    cur.orders  += 1;
    byDay.set(day, cur);
  }
  const revenue_by_day = Array.from(byDay.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Revenue by payment method
  const byPayment = new Map<string, { revenue: number; count: number }>();
  for (const o of rows) {
    const m = (o.payment_method as string) ?? "unknown";
    const cur = byPayment.get(m) ?? { revenue: 0, count: 0 };
    cur.revenue += o.total ?? 0;
    cur.count   += 1;
    byPayment.set(m, cur);
  }
  const revenue_by_payment = Array.from(byPayment.entries()).map(([method, v]) => ({
    method, ...v,
  }));

  // Orders list (for table)
  const orders_list = rows.map((o) => ({
    id:             o.id,
    order_number:   o.order_number,
    created_at:     o.created_at,
    customer:       (o.guest_name as string) ?? o.guest_email ?? "—",
    payment_method: o.payment_method,
    status:         o.status,
    total:          o.total,
  })).reverse(); // newest first for table

  return NextResponse.json({
    total_revenue,
    total_orders,
    ticket_medio,
    revenue_by_day,
    revenue_by_payment,
    orders_list,
  });
}
