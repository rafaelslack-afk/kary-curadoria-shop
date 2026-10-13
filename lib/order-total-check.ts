import { createAdminClient } from "@/lib/supabase/admin";
import { verifyShippingQuote, toCents } from "@/lib/shipping-quote";

// Checagem do total do pedido — FASE 1 (só observação).
//
// Recalcula no servidor o que o pedido deveria custar e compara com o total
// enviado pelo navegador (o que foi cobrado). NUNCA recusa nem altera o
// pedido: grava o resultado em order_total_checks e, se divergir, registra o
// log TOTAL_DIVERGENTE com os valores e o motivo. Nunca lança.
//
// Regras do cupom: as mesmas de /api/coupons/validate (valor/percentual,
// pedido mínimo, produto específico, forma de pagamento) + a exceção de
// abandono recente de /api/orders/create. Limite de usos e validade já são
// recusados pelo orders/create antes da cobrança e não são refeitos aqui
// (a checagem roda depois do incremento de used_count).

export interface OrderTotalCheckInput {
  orderId: string;
  orderNumber: number;
  paymentMethod: string;
  email: string;
  cep: string;
  items: { productId: string; size: string; price: number; quantity: number }[];
  subtotal: number;
  discount: number;
  couponCode?: string | null;
  shipping: { codigo: string; preco: number; quoteToken?: unknown };
  plusSizeMarkups: Record<string, number>;
}

interface CouponRow {
  active: boolean;
  type: "percent" | "fixed";
  value: number;
  min_order: number | null;
  product_id: string | null;
  allowed_payment_methods: string | null;
}

export interface OrderTotalCheckDeps {
  fetchCoupon: (code: string) => Promise<CouponRow | null>;
  hasRecentAbandonment: (email: string) => Promise<boolean>;
  saveCheck: (row: Record<string, unknown>) => Promise<void>;
}

const reais = (cents: number) => Math.round(cents) / 100;
const differs = (a: number, b: number) => Math.abs(a - b) > 1; // tolerância de 1 centavo

export async function checkOrderTotal(
  input: OrderTotalCheckInput,
  depsOverride?: OrderTotalCheckDeps
): Promise<void> {
  try {
    const deps = depsOverride ?? defaultDeps();
    const reasons: string[] = [];

    // Subtotal = soma dos itens (preços unitários já validados no orders/create)
    const badQuantity = input.items.some((i) => !Number.isInteger(i.quantity) || i.quantity < 1);
    if (badQuantity) reasons.push("quantidade_invalida");
    const expectedSubtotal = input.items.reduce((s, i) => s + toCents(i.price) * i.quantity, 0);
    const clientSubtotal = toCents(input.subtotal);
    if (differs(clientSubtotal, expectedSubtotal)) reasons.push("subtotal_diferente");

    // Desconto esperado pelas regras do cupom
    let expectedDiscount = 0;
    if (input.couponCode) {
      const coupon = await deps.fetchCoupon(input.couponCode);
      if (!coupon) {
        reasons.push("cupom_inexistente");
      } else {
        const allowed = coupon.allowed_payment_methods ?? "all";
        const productIds = input.items.map((i) => i.productId);
        const ruleFailures: string[] = [];
        if (!coupon.active && !(await deps.hasRecentAbandonment(input.email))) ruleFailures.push("cupom_inativo");
        if (expectedSubtotal < toCents(coupon.min_order ?? 0)) ruleFailures.push("cupom_pedido_minimo");
        if (coupon.product_id && !productIds.includes(coupon.product_id)) ruleFailures.push("cupom_produto");
        if (allowed !== "all" && allowed !== input.paymentMethod) ruleFailures.push("cupom_forma_pagamento");
        reasons.push(...ruleFailures);
        if (ruleFailures.length === 0) {
          expectedDiscount =
            coupon.type === "percent"
              ? (expectedSubtotal * Number(coupon.value)) / 100
              : Math.min(toCents(Number(coupon.value)), expectedSubtotal);
        }
      }
    }
    const clientDiscount = toCents(input.discount);
    if (differs(clientDiscount, expectedDiscount)) reasons.push("desconto_diferente");

    // Frete: comprovante assinado da cotação
    const clientShipping = toCents(input.shipping.preco);
    const quote = verifyShippingQuote(input.shipping.quoteToken, {
      serviceId: input.shipping.codigo,
      preco: input.shipping.preco,
      cep: input.cep,
    });
    if (!quote.ok) reasons.push(quote.reason);
    // Frete esperado: o cotado (comprovante autêntico); sem comprovante válido, o informado.
    const quotedShipping = quote.ok ? quote.priceCents : quote.quotedCents;
    const expectedShipping = quotedShipping ?? clientShipping;

    const clientTotal = clientSubtotal - clientDiscount + clientShipping;
    const expectedTotal = expectedSubtotal - expectedDiscount + expectedShipping;
    if (differs(clientTotal, expectedTotal)) reasons.push("total_diferente");

    const row = {
      order_id: input.orderId,
      order_number: input.orderNumber,
      ok: reasons.length === 0,
      reasons,
      payment_method: input.paymentMethod,
      has_coupon: Boolean(input.couponCode),
      has_plus_size: input.items.some((i) => (input.plusSizeMarkups[i.size] ?? 0) > 0),
      client_total: reais(clientTotal),
      expected_total: reais(expectedTotal),
      client_subtotal: reais(clientSubtotal),
      expected_subtotal: reais(expectedSubtotal),
      client_discount: reais(clientDiscount),
      expected_discount: reais(expectedDiscount),
      client_shipping: reais(clientShipping),
      quoted_shipping: quotedShipping !== undefined ? reais(quotedShipping) : null,
    };

    if (row.ok) {
      console.log(`[orders/create] TOTAL_OK pedido #${input.orderNumber} total=${row.client_total}`);
    } else {
      console.warn(`[orders/create] TOTAL_DIVERGENTE pedido #${input.orderNumber}`, JSON.stringify(row));
    }
    await deps.saveCheck(row);
  } catch (err) {
    console.error("[orders/create] Checagem do total falhou (pedido não afetado):", err);
  }
}

function defaultDeps(): OrderTotalCheckDeps {
  const admin = createAdminClient();
  return {
    async fetchCoupon(code) {
      const { data } = await admin
        .from("coupons")
        .select("active, type, value, min_order, product_id, allowed_payment_methods")
        .eq("code", code)
        .maybeSingle();
      return (data as CouponRow | null) ?? null;
    },
    // Mesma regra do orders/create: abandono registrado nos últimos 7 dias.
    async hasRecentAbandonment(email) {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await admin
        .from("abandoned_checkouts")
        .select("id")
        .eq("email", email.trim().toLowerCase())
        .gte("created_at", since)
        .limit(1)
        .maybeSingle();
      return Boolean(data);
    },
    async saveCheck(row) {
      const { error } = await admin.from("order_total_checks").insert(row);
      if (error) {
        console.warn("[orders/create] order_total_checks não gravado (migration aplicada?):", error.message);
      }
    },
  };
}
