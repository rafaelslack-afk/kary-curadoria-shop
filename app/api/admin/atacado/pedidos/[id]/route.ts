import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createNoStoreAdminClient } from "@/lib/supabase/admin-no-store";
import { getWholesaleOrderById } from "@/lib/atacado/pedidos";
import { isStatusAtacado } from "@/lib/atacado/status";
import { isFormaPagamento, precoAtacado } from "@/lib/atacado/pricing";
import { getRegraPrecoAtacado } from "@/lib/atacado/config";
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

// GET /api/admin/atacado/pedidos/[id]
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  if (!UUID_RE.test(params.id)) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });

  const order = await getWholesaleOrderById(params.id);
  if (!order) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  return NextResponse.json(
    { order, sugestoes: await precosSugeridos(order.items) },
    { headers: { "Cache-Control": "no-store" } }
  );
}

// Preço sugerido (regra de atacado, preço de varejo ATUAL) de cada variante
// do pedido nas duas formas de pagamento: usado ao trocar a forma no admin.
async function precosSugeridos(items: { variant_id: string | null }[]) {
  const ids = Array.from(new Set(items.map((i) => i.variant_id).filter((v): v is string => !!v)));
  const out: Record<string, { pix: number; credit_card: number }> = {};
  if (ids.length === 0) return out;
  const db = createNoStoreAdminClient();
  const { data } = await db.from("product_variants").select("id, size, products(price)").in("id", ids);
  const regra = await getRegraPrecoAtacado();
  for (const v of (data ?? []) as unknown as { id: string; size: string; products: { price: number | string } | null }[]) {
    if (!v.products) continue;
    const price = Number(v.products.price);
    out[v.id] = {
      pix: precoAtacado(price, v.size, "pix", regra),
      credit_card: precoAtacado(price, v.size, "credit_card", regra),
    };
  }
  return out;
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

  if (!isStatusAtacado(body.status)) return NextResponse.json({ error: "Status inválido." }, { status: 400 });
  if (!isFormaPagamento(body.payment_method)) {
    return NextResponse.json({ error: "Forma de pagamento inválida." }, { status: 400 });
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

  // Itens
  const rawItems = Array.isArray(body.items) ? body.items.slice(0, 500) : [];
  const items = [];
  for (const raw of rawItems) {
    const it = (raw ?? {}) as Record<string, unknown>;
    const quantity = Math.floor(Number(it.quantity));
    const unit = money(it.unit_price);
    const name = text(it.product_name, 200);
    if (!name || !Number.isFinite(quantity) || quantity <= 0 || quantity > 9999 || unit === null) {
      return NextResponse.json({ error: "Item inválido no pedido." }, { status: 400 });
    }
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
      price_overridden: it.price_overridden === true,
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

  const order = await getWholesaleOrderById(params.id);
  return NextResponse.json({ order });
}
