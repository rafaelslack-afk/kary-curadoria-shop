import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAtacadoAccess } from "@/lib/atacado/access";
import { getRegraPrecoAtacado, newRomaneioToken } from "@/lib/atacado/config";
import { isFormaPagamento, labelFormaPagamento, precoAtacado } from "@/lib/atacado/pricing";
import { formatarDocumento, validarDocumento } from "@/lib/atacado/documento";
import { buildAtacadoWhatsAppUrl, mensagemPedidoAtacado } from "@/lib/atacado/whatsapp";
import { mensagemForaDoAtacado, mensagemVarianteIndisponivel, varianteDisponivelAtacado } from "@/lib/atacado/disponibilidade";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/atacado/pedidos — envio do pedido de atacado.
//
// Separado do varejo: não usa app/api/orders, não baixa estoque, não chama
// pagamento, frete, ERP, e-mails nem eventos de Meta/TikTok. Preços enviados
// pelo navegador são ignorados: tudo é recalculado aqui com precoAtacado e
// os dados do banco.

const MAX_PEDIDOS_POR_IP_HORA = 10;
const MAX_LINHAS = 300;
const MAX_QTD = 999;
const UF_RE = /^[A-Z]{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function digits(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/\D/g, "").slice(0, max) : "";
}

function hashIp(request: NextRequest): string | null {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim() || "";
  if (!ip) return null;
  return createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "kvo-atacado")
    .update(`atacado-ip:${ip}`)
    .digest("hex");
}

function erro(message: string, status = 400, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

interface VariantRow {
  id: string;
  sku: string | null;
  size: string;
  color: string | null;
  active: boolean;
  stock_qty: number;
  product_id: string;
  products: {
    id: string;
    name: string;
    sku_base: string | null;
    price: number | string;
    active: boolean;
    atacado_enabled: boolean;
  } | null;
}

export async function POST(request: NextRequest) {
  // 1. Acesso pelo link secreto (cookie)
  const { ok, config } = await checkAtacadoAccess();
  if (!ok) return erro("Este link de atacado expirou. Peça um novo link à nossa equipe.", 401);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return erro("Dados inválidos.");
  }

  // 2. Dados da cliente
  const cliente = (body.cliente ?? {}) as Record<string, unknown>;
  const endereco = (cliente.endereco ?? {}) as Record<string, unknown>;
  const nome = text(cliente.nome, 120);
  const documento = digits(cliente.documento, 14);
  const loja = text(cliente.loja, 120) || null;
  const email = text(cliente.email, 160).toLowerCase();
  const telefone = digits(cliente.telefone, 13);
  const observacoes = text(cliente.observacoes, 1000) || null;
  const address = {
    cep: digits(endereco.cep, 8),
    logradouro: text(endereco.logradouro, 160),
    numero: text(endereco.numero, 20),
    complemento: text(endereco.complemento, 80),
    bairro: text(endereco.bairro, 80),
    cidade: text(endereco.cidade, 80),
    uf: text(endereco.uf, 2).toUpperCase(),
  };

  if (nome.length < 3) return erro("Informe o nome completo.");
  if (!validarDocumento(documento)) return erro("CPF ou CNPJ inválido.");
  if (!EMAIL_RE.test(email)) return erro("E-mail inválido.");
  if (telefone.length < 10) return erro("Telefone inválido.");
  if (address.cep.length !== 8 || !address.logradouro || !address.numero || !address.bairro || !address.cidade || !UF_RE.test(address.uf)) {
    return erro("Endereço incompleto.");
  }
  if (body.aceite !== true) return erro("É preciso concordar com as condições de compra no atacado.");

  const formaPagamento = body.formaPagamento;
  if (!isFormaPagamento(formaPagamento)) return erro("Forma de pagamento inválida.");

  // 3. Itens: só variante e quantidade são aceitos do navegador
  const quantidades = new Map<string, number>();
  for (const raw of Array.isArray(body.items) ? body.items.slice(0, MAX_LINHAS) : []) {
    const it = (raw ?? {}) as Record<string, unknown>;
    const variantId = typeof it.variantId === "string" ? it.variantId : "";
    const qtd = Math.floor(Number(it.quantity));
    if (!UUID_RE.test(variantId) || !Number.isFinite(qtd) || qtd <= 0) continue;
    quantidades.set(variantId, Math.min((quantidades.get(variantId) ?? 0) + qtd, MAX_QTD));
  }
  if (quantidades.size === 0) return erro("O pedido está vazio.");

  const admin = createAdminClient();

  // 4. Limite de envios por IP (contra abuso)
  const ipHash = hashIp(request);
  if (ipHash) {
    const { count } = await admin
      .from("wholesale_orders")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
    if ((count ?? 0) >= MAX_PEDIDOS_POR_IP_HORA) {
      return erro("Muitos pedidos enviados em pouco tempo. Tente de novo mais tarde ou fale com a nossa equipe pelo WhatsApp.", 429);
    }
  }

  // 5. Preços recalculados com os dados do banco
  const { data: rows, error: variantsError } = await admin
    .from("product_variants")
    .select("id, sku, size, color, active, stock_qty, product_id, products(id, name, sku_base, price, active, atacado_enabled)")
    .in("id", Array.from(quantidades.keys()));
  if (variantsError) return erro("Não foi possível conferir as peças agora. Tente de novo em instantes.", 503);

  const variants = (rows ?? []) as unknown as VariantRow[];
  // Variante inexistente, inativa ou de produto inativo
  const indisponiveis = Array.from(quantidades.keys()).filter((id) => {
    const v = variants.find((x) => x.id === id);
    return !v || !v.active || !v.products || !v.products.active;
  });
  if (indisponiveis.length > 0) {
    return erro("Algumas peças do pedido não estão mais disponíveis. Remova-as e envie de novo.", 409, {
      indisponiveis,
    });
  }

  // Peça desativada no atacado (cadastro do produto): recusa nomeando a peça
  const foraDoAtacado = variants.filter((v) => v.products!.atacado_enabled === false);
  if (foraDoAtacado.length > 0) {
    const nomes = Array.from(new Set(foraDoAtacado.map((v) => v.products!.name)));
    return erro(mensagemForaDoAtacado(nomes.join(", ")), 409, {
      foraDoAtacado: Array.from(new Set(foraDoAtacado.map((v) => v.product_id))),
    });
  }

  // Variante sem estoque (stock_qty = 0): recusa nomeando a peça. Só a
  // disponibilidade conta; a QUANTIDADE não é conferida contra o estoque.
  const semEstoque = variants.filter((v) => !varianteDisponivelAtacado(v));
  if (semEstoque.length > 0) {
    const v = semEstoque[0];
    return erro(mensagemVarianteIndisponivel(v.products!.name, v.color, v.size), 409, {
      variantesIndisponiveis: semEstoque.map((x) => x.id),
    });
  }

  const regra = await getRegraPrecoAtacado(config);
  const items = variants.map((v) => {
    const quantity = quantidades.get(v.id)!;
    const unit = precoAtacado(Number(v.products!.price), v.size, formaPagamento, regra);
    return {
      product_id: v.product_id,
      variant_id: v.id,
      sku: v.sku,
      reference: v.products!.sku_base,
      product_name: v.products!.name,
      color: v.color,
      size: v.size,
      quantity,
      unit_price: unit,
      total_price: Math.round(unit * quantity * 100) / 100,
    };
  });

  const pieces = items.reduce((n, it) => n + it.quantity, 0);
  if (pieces < config.minimoPecas) {
    const faltam = config.minimoPecas - pieces;
    return erro(
      `Pedido mínimo de ${config.minimoPecas} peças. ${faltam === 1 ? "Falta 1 peça" : `Faltam ${faltam} peças`}.`,
      400,
      { faltam }
    );
  }
  const itemsTotal = Math.round(items.reduce((s, it) => s + it.total_price, 0) * 100) / 100;

  // 6. Grava o pedido (status "novo", número ATC-xxxx gerado pelo banco)
  const romaneioToken = newRomaneioToken();
  const { data: order, error: orderError } = await admin
    .from("wholesale_orders")
    .insert({
      status: "novo",
      payment_method: formaPagamento,
      customer_name: nome,
      store_name: loja,
      document: documento,
      email,
      phone: telefone,
      address_json: address,
      notes: observacoes,
      items_total: itemsTotal,
      total: itemsTotal,
      pieces_count: pieces,
      romaneio_token: romaneioToken,
      ip_hash: ipHash,
    })
    .select("id, order_number")
    .single();
  if (orderError || !order) {
    console.error("[atacado] falha ao gravar pedido:", orderError?.code ?? "sem_retorno");
    return erro("Não foi possível registrar o pedido agora. Tente de novo em instantes.", 503);
  }

  const { error: itemsError } = await admin
    .from("wholesale_order_items")
    .insert(items.map((it) => ({ ...it, order_id: order.id })));
  if (itemsError) {
    // Sem itens o pedido não serve: desfaz para a cliente poder reenviar
    await admin.from("wholesale_orders").delete().eq("id", order.id);
    console.error("[atacado] falha ao gravar itens:", itemsError.code);
    return erro("Não foi possível registrar o pedido agora. Tente de novo em instantes.", 503);
  }

  // 7. Mensagem para o WhatsApp do ATACADO
  const mensagem = mensagemPedidoAtacado({
    orderNumber: order.order_number,
    customerName: nome,
    storeName: loja,
    document: formatarDocumento(documento),
    cidade: address.cidade,
    uf: address.uf,
    formaPagamento: labelFormaPagamento(formaPagamento),
    pieces,
    itemsTotal,
    romaneioToken,
  });

  return NextResponse.json(
    {
      orderNumber: order.order_number,
      pieces,
      itemsTotal,
      whatsappUrl: buildAtacadoWhatsAppUrl(config.whatsapp, mensagem),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
