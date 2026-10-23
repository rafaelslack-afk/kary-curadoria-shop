import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createNoStoreAdminClient } from "@/lib/supabase/admin-no-store";
import { getWholesaleOrderAdminById } from "@/lib/atacado/pedidos";
import { isFormaPagamento } from "@/lib/atacado/pricing";
import { descontosDoPedido, montarPedidoAdmin, planejarTrocaPagamento } from "@/lib/atacado/recalculo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /api/admin/atacado/pedidos/[id]/pagamento
// { payment_method, recalcular_editados?: boolean, aplicar?: boolean }
//
// Troca a forma de pagamento do pedido de atacado e recalcula os preços NO
// SERVIDOR (o navegador só manda a nova forma e a escolha sobre os preços
// editados à mão). Sem `aplicar`, devolve só o resumo (totais antigo e novo,
// itens editados, itens sem preço bruto) para a confirmação; com `aplicar`,
// grava. Só mexe em wholesale_orders e wholesale_order_items: nada de estoque,
// ERP, pagamento ou pedidos do varejo. Frete e status permanecem.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  if (!isFormaPagamento(body.payment_method)) {
    return NextResponse.json({ error: "Forma de pagamento inválida." }, { status: 400 });
  }
  const forma = body.payment_method;

  const order = await getWholesaleOrderAdminById(params.id);
  if (!order) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  if (forma === order.payment_method) {
    return NextResponse.json({ error: "O pedido já está nessa forma de pagamento." }, { status: 400 });
  }

  const descontos = await descontosDoPedido(order);
  const plano = planejarTrocaPagamento(order, forma, descontos, body.recalcular_editados === true);

  if (body.aplicar !== true) {
    // Resumo só com valores (nenhum percentual) para a confirmação
    return NextResponse.json(
      {
        editados: plano.editados,
        semBase: plano.semBase,
        totalAntigo: plano.totalAntigo,
        totalNovo: plano.totalNovo,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const db = createNoStoreAdminClient();
  const mudaram = plano.itens.filter((p) => p.mudou);
  const originais = order.items.filter((it) => mudaram.some((p) => p.id === it.id));

  // Itens primeiro (um único upsert); se o pedido falhar depois, devolve os itens
  if (mudaram.length > 0) {
    const rows = mudaram.map((p) => {
      const it = order.items.find((x) => x.id === p.id)!;
      return {
        id: it.id,
        order_id: order.id,
        product_id: it.product_id,
        variant_id: it.variant_id,
        sku: it.sku,
        reference: it.reference,
        product_name: it.product_name,
        color: it.color,
        size: it.size,
        quantity: it.quantity,
        base_unit_price: it.base_unit_price,
        unit_price: p.unit_price,
        total_price: p.total_price,
        price_overridden: p.price_overridden,
      };
    });
    const { error } = await db.from("wholesale_order_items").upsert(rows, { onConflict: "id" });
    if (error) return NextResponse.json({ error: "Não foi possível recalcular os itens." }, { status: 500 });
  }

  const { error: orderError } = await db
    .from("wholesale_orders")
    .update({
      payment_method: forma,
      items_total: plano.totalNovo.itens,
      total: plano.totalNovo.geral,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);
  if (orderError) {
    if (originais.length > 0) {
      await db.from("wholesale_order_items").upsert(
        originais.map((it) => ({
          id: it.id,
          order_id: order.id,
          product_id: it.product_id,
          variant_id: it.variant_id,
          sku: it.sku,
          reference: it.reference,
          product_name: it.product_name,
          color: it.color,
          size: it.size,
          quantity: it.quantity,
          base_unit_price: it.base_unit_price,
          unit_price: it.unit_price,
          total_price: it.total_price,
          price_overridden: it.price_overridden,
        })),
        { onConflict: "id" }
      );
    }
    return NextResponse.json({ error: "Não foi possível salvar a forma de pagamento." }, { status: 500 });
  }

  const atualizado = await getWholesaleOrderAdminById(order.id);
  if (!atualizado) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  return NextResponse.json({ order: await montarPedidoAdmin(atualizado), semBase: plano.semBase });
}
