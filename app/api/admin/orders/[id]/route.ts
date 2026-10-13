import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
};

// GET /api/admin/orders/[id]
// Pedido completo (CPF, telefone, endereço, NF, itens) para a tela do admin.
// Mesma consulta e mesma resposta do antigo GET /api/orders/[id]?full=1.
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: "ID do pedido nao informado." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: order, error } = await admin
    .from("orders")
    .select(`
      id, order_number, status, payment_method,
      pagbank_charge_id, pagbank_status,
      guest_name, guest_email, guest_cpf, customer_phone,
      subtotal, shipping_cost, discount, coupon_code, total,
      shipping_service, shipping_deadline, shipping_address_json,
      tracking_code, label_url, nf_number, nf_key, nf_status, notes,
      created_at, updated_at,
      order_items (
        id, product_id, variant_id,
        product_name, size_snapshot, color_snapshot, sku_snapshot,
        quantity, unit_price, total_price
      )
    `)
    .eq("id", id)
    .single();

  if (error || !order) {
    console.error(`[Admin Orders GET] Pedido nao encontrado: ${id}`, error?.message);
    return NextResponse.json(
      { error: "Pedido nao encontrado." },
      { status: 404, headers: NO_CACHE }
    );
  }

  return NextResponse.json(order, { headers: NO_CACHE });
}
