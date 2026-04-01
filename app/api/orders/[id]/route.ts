import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderShippedEmail } from "@/lib/email/send";

// Desabilita qualquer cache estático do Next.js nesta rota
export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE = { "Cache-Control": "no-store, no-cache, must-revalidate", Pragma: "no-cache" };

// ---------------------------------------------------------------------------
// GET /api/orders/[id]
// Usado em dois contextos:
//   1. Polling do checkout PIX (campos mínimos, retrocompatível)
//   2. Painel admin — retorna pedido completo com itens quando ?full=1
// ---------------------------------------------------------------------------
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const full = request.nextUrl.searchParams.get("full") === "1";

  if (!id) {
    return NextResponse.json({ error: "ID do pedido não informado." }, { status: 400 });
  }

  const admin = createAdminClient();

  if (full) {
    // Retorna pedido completo para o painel admin
    const { data: order, error } = await admin
      .from("orders")
      .select(`
        id, order_number, status, payment_method,
        pagbank_charge_id, pagbank_status,
        guest_name, guest_email, guest_cpf,
        subtotal, shipping_cost, discount, coupon_code, total,
        shipping_service, shipping_deadline, shipping_address_json,
        tracking_code, nf_number, nf_key, nf_status, notes,
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
      console.error(`[Orders GET full] Pedido não encontrado: ${id}`, error?.message);
      return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404, headers: NO_CACHE });
    }

    return NextResponse.json(order, { headers: NO_CACHE });
  }

  // Modo polling mínimo (retrocompatível com /checkout/pix)
  const { data: order, error } = await admin
    .from("orders")
    .select("id, order_number, status, pagbank_status, total, shipping_deadline, payment_method")
    .eq("id", id)
    .single();

  if (error || !order) {
    console.error(`[Orders GET] Pedido não encontrado: ${id}`, error?.message);
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404, headers: NO_CACHE });
  }

  console.log(`[Orders GET] id=${id} status=${order.status} mpStatus=${order.pagbank_status}`);

  return NextResponse.json(
    {
      id: order.id,
      orderNumber: order.order_number,
      status: order.status,
      mpStatus: order.pagbank_status,
      total: order.total,
      prazo: order.shipping_deadline,
      paymentMethod: order.payment_method,
      qr_code: null,
      qr_code_base64: null,
    },
    { headers: NO_CACHE }
  );
}

// ---------------------------------------------------------------------------
// PUT /api/orders/[id]
// Atualiza campos editáveis: status, tracking_code, nf_number, nf_key,
// nf_status, notes
// ---------------------------------------------------------------------------
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: "ID do pedido não informado." }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  // Whitelist de campos editáveis via admin
  const allowed = ["status", "tracking_code", "nf_number", "nf_key", "nf_status", "notes"];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nenhum campo válido para atualizar." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .update(patch)
    .eq("id", id)
    .select("id, order_number, status, tracking_code, nf_number, nf_key, nf_status, notes, guest_name, guest_email, shipping_service")
    .single();

  if (error) {
    console.error(`[Orders PUT] Erro ao atualizar pedido ${id}:`, error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Enviar e-mail de envio quando tracking_code é definido pela primeira vez
  if (patch.tracking_code && data?.guest_email) {
    try {
      await sendOrderShippedEmail({
        to: data.guest_email,
        orderNumber: String(data.order_number),
        customerName: data.guest_name ?? "Cliente",
        trackingCode: String(patch.tracking_code),
        carrier: data.shipping_service ?? undefined,
      });
    } catch (emailErr) {
      console.error(`[Orders PUT] Falha ao enviar e-mail de envio:`, emailErr);
    }
  }

  console.log(`[Orders PUT] id=${id} patch=${JSON.stringify(patch)}`);
  return NextResponse.json(data, { headers: NO_CACHE });
}
