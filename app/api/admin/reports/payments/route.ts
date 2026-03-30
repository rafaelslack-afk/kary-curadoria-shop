import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PAID = ["paid", "preparing", "shipped", "delivered"];

const METHOD_LABEL: Record<string, string> = {
  pix:         "PIX",
  credit_card: "Cartão",
  boleto:      "Boleto",
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const start = searchParams.get("start_date");
  const end   = searchParams.get("end_date");

  const admin = createAdminClient();

  let query = admin
    .from("orders")
    .select("payment_method, total")
    .in("status", PAID);

  if (start) query = query.gte("created_at", start);
  if (end)   query = query.lte("created_at", end + "T23:59:59.999Z");

  const { data: orders, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = orders ?? [];
  const total = rows.reduce((s, o) => s + (o.total ?? 0), 0);

  const byMethod = new Map<string, { count: number; revenue: number }>();
  for (const o of rows) {
    const m = (o.payment_method as string) ?? "unknown";
    const cur = byMethod.get(m) ?? { count: 0, revenue: 0 };
    cur.count   += 1;
    cur.revenue += o.total ?? 0;
    byMethod.set(m, cur);
  }

  const by_method = Array.from(byMethod.entries())
    .map(([method, v]) => ({
      method,
      label:   METHOD_LABEL[method] ?? method,
      count:   v.count,
      revenue: v.revenue,
      pct:     total > 0 ? Math.round((v.revenue / total) * 100) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return NextResponse.json({ by_method, total_revenue: total });
}
