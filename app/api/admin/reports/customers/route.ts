import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PAID = ["paid", "preparing", "shipped", "delivered"];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const start = searchParams.get("start_date");
  const end   = searchParams.get("end_date");

  const admin = createAdminClient();

  let query = admin
    .from("orders")
    .select("id, guest_email, guest_name, total, status, created_at")
    .not("guest_email", "is", null)
    .neq("guest_email", "");

  if (start) query = query.gte("created_at", start);
  if (end)   query = query.lte("created_at", end + "T23:59:59.999Z");

  const { data: orders, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Group by normalised email
  const emailMap = new Map<string, {
    name: string; email: string; orders: number; spent: number; dates: string[];
  }>();

  for (const o of orders ?? []) {
    const email = (o.guest_email as string).toLowerCase().trim();
    const cur = emailMap.get(email) ?? {
      name:   (o.guest_name as string) ?? email,
      email,
      orders: 0,
      spent:  0,
      dates:  [],
    };
    cur.dates.push(o.created_at as string);
    if (PAID.includes(o.status as string)) {
      cur.orders += 1;
      cur.spent  += (o.total as number) ?? 0;
    }
    emailMap.set(email, cur);
  }

  const all = Array.from(emailMap.values());

  // New = only 1 order date in period; returning = multiple order dates in period
  const new_customers       = all.filter((c) => c.dates.length === 1).length;
  const returning_customers = all.filter((c) => c.dates.length > 1).length;

  const top_customers = all
    .filter((c) => c.orders > 0)
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 20)
    .map(({ name, email, orders, spent }) => ({ name, email, orders, spent }));

  return NextResponse.json({ new_customers, returning_customers, top_customers });
}
