import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAID_STATUSES = ["paid", "preparing", "shipped", "delivered"];

export async function GET() {
  const admin = createAdminClient();

  // ── Source 1: registered customers ──────────────────────────────────────────
  const { data: customers } = await admin
    .from("customers")
    .select(`id, name, email, phone, created_at, orders!customer_id(id, total, status)`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const registeredList = (customers ?? []).map((c: any) => {
    const orders = (c.orders ?? []) as { total: number; status: string }[];
    const paid = orders.filter((o) => PAID_STATUSES.includes(o.status));
    return {
      id: c.id as string,
      name: c.name as string,
      email: c.email as string,
      phone: c.phone as string | null,
      created_at: c.created_at as string,
      total_orders: paid.length,
      total_spent: paid.reduce((s, o) => s + (o.total ?? 0), 0),
      type: "registered" as const,
    };
  });

  // ── Source 2: guest orders grouped by email ──────────────────────────────────
  const { data: guestOrders } = await admin
    .from("orders")
    .select("id, guest_name, guest_email, total, status, created_at")
    .not("guest_email", "is", null)
    .neq("guest_email", "")
    .order("created_at", { ascending: false });

  // Group by normalised email
  const guestMap = new Map<string, {
    id: string; name: string; email: string; phone: null;
    created_at: string; total_orders: number; total_spent: number;
    type: "guest";
  }>();

  for (const o of guestOrders ?? []) {
    if (!o.guest_email) continue;
    const email = (o.guest_email as string).toLowerCase().trim();
    if (!guestMap.has(email)) {
      guestMap.set(email, {
        id: email,                            // email acts as stable id for guests
        name: (o.guest_name as string) ?? email,
        email,
        phone: null,
        created_at: o.created_at as string,   // earliest will be updated below
        total_orders: 0,
        total_spent: 0,
        type: "guest",
      });
    }
    const entry = guestMap.get(email)!;
    // Keep the earliest created_at as "first purchase date"
    if ((o.created_at as string) < entry.created_at) {
      entry.created_at = o.created_at as string;
    }
    // Accumulate paid totals
    if (PAID_STATUSES.includes(o.status as string)) {
      entry.total_orders += 1;
      entry.total_spent += (o.total as number) ?? 0;
    }
  }

  const guestList = Array.from(guestMap.values());

  // ── Merge + sort ─────────────────────────────────────────────────────────────
  const result = [...registeredList, ...guestList].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return NextResponse.json(result);
}
