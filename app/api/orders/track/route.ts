import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// GET /api/orders/track?order_number=123&email=cliente@email.com
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const rawNumber = searchParams.get("order_number");
  const email = searchParams.get("email")?.trim().toLowerCase();

  if (!rawNumber || !email) {
    return NextResponse.json(
      { error: "Número do pedido e e-mail são obrigatórios." },
      { status: 400 }
    );
  }

  const orderNumber = parseInt(rawNumber, 10);
  if (isNaN(orderNumber)) {
    return NextResponse.json(
      { error: "Número do pedido inválido." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: order, error } = await admin
    .from("orders")
    .select(`
      id,
      order_number,
      status,
      payment_method,
      total,
      subtotal,
      shipping_cost,
      discount,
      shipping_service,
      shipping_deadline,
      shipping_address_json,
      tracking_code,
      created_at,
      guest_email,
      order_items (
        id,
        product_name,
        size_snapshot,
        color_snapshot,
        sku_snapshot,
        quantity,
        unit_price,
        total_price
      )
    `)
    .eq("order_number", orderNumber)
    .single();

  if (error || !order) {
    return NextResponse.json(
      { error: "Pedido não encontrado. Verifique o número e o e-mail informados." },
      { status: 404 }
    );
  }

  // Verificar se o e-mail bate com o pedido (guest_email)
  const orderEmail = (order.guest_email ?? "").trim().toLowerCase();
  if (orderEmail !== email) {
    return NextResponse.json(
      { error: "Pedido não encontrado. Verifique o número e o e-mail informados." },
      { status: 404 }
    );
  }

  // Retornar apenas dados públicos (sem CPF, pagbank_charge_id, nf_key, etc.)
  return NextResponse.json({
    order_number: order.order_number,
    status: order.status,
    payment_method: order.payment_method,
    total: order.total,
    subtotal: order.subtotal,
    shipping_cost: order.shipping_cost,
    discount: order.discount,
    shipping_service: order.shipping_service,
    shipping_deadline: order.shipping_deadline,
    shipping_address_json: order.shipping_address_json,
    tracking_code: order.tracking_code,
    created_at: order.created_at,
    order_items: order.order_items,
  });
}
