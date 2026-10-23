import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createNoStoreAdminClient } from "@/lib/supabase/admin-no-store";
import { getWholesaleOrderAdminById } from "@/lib/atacado/pedidos";
import { isStatusAtacado } from "@/lib/atacado/status";
import { isFormaPagamento, precoBrutoAtacado, precoComDesconto } from "@/lib/atacado/pricing";
import { getRegraPrecoAtacado } from "@/lib/atacado/config";
import { descontosDoPedido, montarPedidoAdmin } from "@/lib/atacado/recalculo";
import { validarDocumento } from "@/lib/atacado/documento";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function money(v: unknown): number | null {
  const n = Math.round(Number(v) * 100) / 100;
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// GET /api/admin/atacado/pedidos/[id] — pedido com preço bruto (só admin)
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });

  const order = await getWholesaleOrderAdminById(params.id);
  if (!order) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  return NextResponse.json({ order: await montarPedidoAdmin(order) }, { headers: { "Cache-Control": "no-store" } });
}

// PUT /api/admin/atacado/pedidos/[id] — salva o pedido inteiro (dados da
// cliente, pagamento, status, frete e itens). Totais recalculados aqui.
// Só mexe nas tabelas do atacado: nada de estoque, ERP ou pedidos do varejo.
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const atual = await getWholesaleOrderAdminById(params.id);
  if (!atual) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });

  if (!isStatusAtacado(body.status)) return NextResponse.json({ error: "Status inválido." }, { status: 400 });
  if (!isFormaPagamento(body.payment_method)) {
    return NextResponse.json({ error: "Forma de pagamento inválida." }, { status: 400 });
  }
  // A troca da forma de pagamento recalcula os preços e passa por
  // /pagamento (conta no servidor, com confirmação); aqui ela não muda.
  if (body.payment_method !== atual.payment_method) {
    return NextResponse.json({ error: "Para trocar a forma de pagamento use a troca de pagamento do pedido." }, { status: 400 });
  }

  const document = text(body.document, 20).replace(/\D/g, "");
  if (!validarDocumento(document)) return NextResponse.json({ error: "CPF ou CNPJ inválido." }, { status: 400 });
  const customerName = text(body.customer_name, 120);
  if (customerName.length < 3) return NextResponse.json({ error: "Informe o nome da cliente." }, { status: 400 });

  const addr = (body.address_json ?? {}) as Record<string, unknown>;
  const address = {
    cep: text(addr.cep, 9).replace(/\D/g, ""),
    logradouro: text(addr.logradouro, 160),
    numero: text(addr.numero, 20),
    complemento: text(addr.complemento, 80),
    bairro: text(addr.bairro, 80),
    cidade: text(addr.cidade, 80),
    uf: text(addr.uf, 2).toUpperCase(),
  };

  const shippingRaw = body.shipping_cost;
  const shipping = shippingRaw === null || shippingRaw === "" || shippingRaw === undefined ? null : money(shippingRaw);
  if (shippingRaw !== null && shippingRaw !== "" && shippingRaw !== undefined && shipping === null) {
    return NextResponse.json({ error: "Frete inválido." }, { status: 400 });
  }

  // Itens. O preço bruto nunca vem do navegador: itens que já estavam no pedido
  // mantêm o bruto gravado; itens novos têm o bruto calculado aqui, pelo preço
  // atual do produto. A marca "editado" também é derivada no servidor.
  const rawItems = Array.isArray(body.items) ? body.items.slice(0, 500) : [];
  const existentes = new Map(atual.items.map((it) => [it.id, it]));
  const descontos = await descontosDoPedido(atual);
  const forma = atual.payment_method;
  const idsNovos = rawItems
    .map((raw) => (raw ?? {}) as Record<string, unknown>)
    .filter((it) => !(typeof it.id === "string" && existentes.has(it.id)) && typeof it.variant_id === "string" && UUID_RE.test(it.variant_id))
    .map((it) => it.variant_id as string);
  const brutoNovo = new Map<string, number>();
  if (idsNovos.length > 0) {
    const db0 = createNoStoreAdminClient();
    const { data: vs } = await db0.from("product_variants").select("id, size, products(price)").in("id", idsNovos);
    const regra = await getRegraPrecoAtacado();
    for (const v of (vs ?? []) as unknown as { id: string; size: string; products: { price: number | string } | null }[]) {
      if (v.products) brutoNovo.set(v.id, precoBrutoAtacado(Number(v.products.price), v.size, regra.markups));
    }
  }
  const items = [];
  for (const raw of rawItems) {
    const it = (raw ?? {}) as Record<string, unknown>;
    const quantity = Math.floor(Number(it.quantity));
    const unit = money(it.unit_price);
    const name = text(it.product_name, 200);
    if (!name || !Number.isFinite(quantity) || quantity <= 0 || quantity > 9999 || unit === null) {
      return NextResponse.json({ error: "Item inválido no pedido." }, { status: 400 });
    }
    const antigo = typeof it.id === "string" ? existentes.get(it.id) : undefined;
    const variantId = typeof it.variant_id === "string" && UUID_RE.test(it.variant_id) ? it.variant_id : null;
    const base = antigo ? antigo.base_unit_price : variantId ? brutoNovo.get(variantId) ?? null : null;
    // Editar o preço à mão marca "editado"; editar só a quantidade não mexe no preço
    const overridden = antigo
      ? antigo.price_overridden || Math.abs(unit - antigo.unit_price) > 0.004
      : base != null && Math.abs(unit - precoComDesconto(base, forma, descontos)) > 0.004;
    items.push({
      order_id: params.id,
      product_id: typeof it.product_id === "string" && UUID_RE.test(it.product_id) ? it.product_id : null,
      variant_id: typeof it.variant_id === "string" && UUID_RE.test(it.variant_id) ? it.variant_id : null,
      sku: text(it.sku, 80) || null,
      reference: text(it.reference, 40) || null,
      product_name: name,
      color: text(it.color, 60) || null,
      size: text(it.size, 20) || null,
      quantity,
      unit_price: unit,
      total_price: Math.round(unit * quantity * 100) / 100,
      price_overridden: overridden,
      base_unit_price: base,
    });
  }
  if (items.length === 0) return NextResponse.json({ error: "O pedido precisa de pelo menos um item." }, { status: 400 });

  const itemsTotal = Math.round(items.reduce((s, it) => s + it.total_price, 0) * 100) / 100;
  const pieces = items.reduce((n, it) => n + it.quantity, 0);
  const total = Math.round((itemsTotal + (shipping ?? 0)) * 100) / 100;

  const db = createNoStoreAdminClient();
  const { data: existing } = await db.from("wholesale_order_items").select("id").eq("order_id", params.id);
  const oldIds = (existing ?? []).map((r) => r.id);

  // Novos itens primeiro; só depois remove os antigos (se a gravação falhar,
  // o pedido continua com os itens anteriores)
  const { error: insertError } = await db.from("wholesale_order_items").insert(items);
  if (insertError) return NextResponse.json({ error: "Não foi possível salvar os itens." }, { status: 500 });
  if (oldIds.length > 0) await db.from("wholesale_order_items").delete().in("id", oldIds);

  const { error: updateError } = await db
    .from("wholesale_orders")
    .update({
      status: body.status,
      payment_method: body.payment_method,
      customer_name: customerName,
      store_name: text(body.store_name, 120) || null,
      document,
      email: text(body.email, 160).toLowerCase(),
      phone: text(body.phone, 20).replace(/\D/g, ""),
      address_json: address,
      notes: text(body.notes, 1000) || null,
      shipping_cost: shipping,
      items_total: itemsTotal,
      total,
      pieces_count: pieces,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id);
  if (updateError) return NextResponse.json({ error: "Não foi possível salvar o pedido." }, { status: 500 });

  const order = await getWholesaleOrderAdminById(params.id);
  if (!order) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  return NextResponse.json({ order: await montarPedidoAdmin(order) });
}
