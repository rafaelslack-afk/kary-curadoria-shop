import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderShippedEmail } from "@/lib/email/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const full = request.nextUrl.searchParams.get("full") === "1";

  if (!id) {
    return NextResponse.json({ error: "ID do pedido nao informado." }, { status: 400 });
  }

  const admin = createAdminClient();

  if (full) {
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
      console.error(`[Orders GET full] Pedido nao encontrado: ${id}`, error?.message);
      return NextResponse.json(
        { error: "Pedido nao encontrado." },
        { status: 404, headers: NO_CACHE }
      );
    }

    return NextResponse.json(order, { headers: NO_CACHE });
  }

  const { data: order, error } = await admin
    .from("orders")
    .select("id, order_number, status, pagbank_status, total, shipping_deadline, payment_method")
    .eq("id", id)
    .single();

  if (error || !order) {
    console.error(`[Orders GET] Pedido nao encontrado: ${id}`, error?.message);
    return NextResponse.json(
      { error: "Pedido nao encontrado." },
      { status: 404, headers: NO_CACHE }
    );
  }

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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: "ID do pedido nao informado." }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  const allowed = ["status", "tracking_code", "nf_number", "nf_key", "nf_status", "notes"];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "Nenhum campo valido para atualizar." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const requestedTrackingCode =
    typeof patch.tracking_code === "string" ? patch.tracking_code.trim() : "";

  const { data: previousOrder, error: previousOrderError } = await admin
    .from("orders")
    .select("status, tracking_code, guest_name, guest_email, order_number, shipping_service")
    .eq("id", id)
    .single();

  if (previousOrderError || !previousOrder) {
    console.error(
      `[Orders PUT] Pedido nao encontrado para atualizar ${id}:`,
      previousOrderError?.message
    );
    return NextResponse.json({ error: "Pedido nao encontrado." }, { status: 404 });
  }

  const previousTrackingCode = previousOrder.tracking_code?.trim() ?? "";
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

  if (previousOrder.status !== "paid" && data.status === "paid") {
    await admin
      .from("inventory_log")
      .update({
        type: "saida",
        sales_channel: "online",
        reason: `Venda online pedido #${data.order_number}`,
      })
      .eq("order_id", id)
      .eq("type", "reserva");
  }

  const shouldSendTrackingEmail =
    requestedTrackingCode.length > 0 &&
    requestedTrackingCode !== previousTrackingCode &&
    Boolean(previousOrder.guest_email);

  if (shouldSendTrackingEmail && previousOrder.guest_email) {
    try {
      await sendOrderShippedEmail({
        to: previousOrder.guest_email,
        orderNumber: String(previousOrder.order_number),
        customerName: previousOrder.guest_name ?? "Cliente",
        trackingCode: requestedTrackingCode,
        carrier: previousOrder.shipping_service ?? undefined,
      });
    } catch (emailErr) {
      console.error("[Orders PUT] Falha ao enviar e-mail de envio:", emailErr);
    }
  }

  return NextResponse.json(data, { headers: NO_CACHE });
}
