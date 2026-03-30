import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PAID_STATUSES = ["paid", "preparing", "shipped", "delivered"];

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = createAdminClient();
  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type");          // "guest" | "registered" | null
  const guestEmail = searchParams.get("email");   // only for type=guest

  // ── Guest customer ────────────────────────────────────────────────────────────
  if (type === "guest" && guestEmail) {
    const email = guestEmail.toLowerCase().trim();

    const { data: ordersRaw, error } = await admin
      .from("orders")
      .select("id, order_number, status, total, payment_method, created_at, guest_name, guest_cpf, shipping_address_json")
      .ilike("guest_email", email)
      .order("created_at", { ascending: false });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orders = ordersRaw as any[];

    if (error || !orders || orders.length === 0) {
      return NextResponse.json({ error: "Comprador não encontrado." }, { status: 404 });
    }

    const mostRecent = orders[0];
    const paid = orders.filter((o) => PAID_STATUSES.includes(o.status));

    return NextResponse.json({
      id: email,
      name: (mostRecent.guest_name as string) ?? email,
      email,
      phone: null,
      cpf: (mostRecent.guest_cpf as string) ?? null,
      address_json: mostRecent.shipping_address_json ?? null,
      created_at: orders[orders.length - 1].created_at,   // earliest order
      type: "guest",
      orders: orders.map((o) => ({
        id: o.id,
        order_number: o.order_number,
        status: o.status,
        total: o.total,
        payment_method: o.payment_method,
        created_at: o.created_at,
      })),
      total_orders: paid.length,
      total_spent: paid.reduce((s, o) => s + ((o.total as number) ?? 0), 0),
    });
  }

  // ── Registered customer ──────────────────────────────────────────────────────
  const { data: customer, error } = await admin
    .from("customers")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !customer) {
    return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
  }

  const { data: orders } = await admin
    .from("orders")
    .select("id, order_number, status, total, payment_method, created_at")
    .eq("customer_id", params.id)
    .order("created_at", { ascending: false });

  const paid = (orders ?? []).filter((o) => PAID_STATUSES.includes(o.status));

  return NextResponse.json({
    ...customer,
    type: "registered",
    orders: orders ?? [],
    total_orders: paid.length,
    total_spent: paid.reduce((s, o) => s + ((o.total as number) ?? 0), 0),
  });
}
