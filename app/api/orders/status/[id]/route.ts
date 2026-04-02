import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: "ID do pedido não informado." }, { status: 400 });
  }

  const supabase = createClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("id, order_number, status, pagbank_status, total, shipping_deadline")
    .eq("id", id)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  return NextResponse.json({
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    mpStatus: order.pagbank_status,   // status do Mercado Pago
    total: order.total,
    prazo: order.shipping_deadline,
  });
}
