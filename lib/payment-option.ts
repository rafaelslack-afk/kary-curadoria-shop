// ── Forma de pagamento detalhada (parcelas) ──────────────────────────────────
// Funções puras, sem dependência de servidor: usadas no envio ao ERP
// (lib/erp/notify-sale.ts), na gravação a partir da resposta do Mercado Pago
// e nas telas do admin.
//
// orders.payment_method  → escolha no checkout: "pix" | "credit_card" | "boleto"
// orders.payment_type    → payment_type_id do Mercado Pago:
//                          "credit_card" | "debit_card" | "bank_transfer" (PIX) | "ticket" (boleto) ...
// orders.installments    → parcelas confirmadas pelo Mercado Pago (PIX = 1)

export type ErpPaymentOption =
  | "pix"
  | "debito"
  | "credito_avista"
  | "credito_3x"
  | "credito_parcelado";

export interface PaymentDetails {
  payment_type: string | null;
  installments: number | null;
}

function normInstallments(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 99 ? n : null;
}

function normType(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim().slice(0, 30) : null;
}

/**
 * Lê payment_type_id e installments de uma resposta de pagamento do Mercado
 * Pago (POST /v1/payments ou GET /v1/payments/{id}). Nunca lança: campo
 * ausente ou inválido vira null. PIX → installments = 1.
 */
export function extractPaymentDetails(mp: unknown): PaymentDetails {
  if (!mp || typeof mp !== "object") return { payment_type: null, installments: null };
  const r = mp as Record<string, unknown>;
  const payment_type = normType(r.payment_type_id);
  const isPix = r.payment_method_id === "pix" || payment_type === "bank_transfer";
  const installments = isPix ? 1 : normInstallments(r.installments);
  return { payment_type, installments };
}

/**
 * Regra única de conversão para o ERP.
 *   PIX                    → "pix"
 *   débito                 → "debito"
 *   crédito 1x             → "credito_avista"
 *   crédito 2x ou 3x       → "credito_3x"
 *   crédito 4x ou mais     → "credito_parcelado"
 *   dado ausente / boleto  → null
 */
export function paymentOptionParaErp(
  payment_method: string | null | undefined,
  payment_type: string | null | undefined,
  installments: number | null | undefined
): ErpPaymentOption | null {
  if (payment_method === "pix" || payment_type === "bank_transfer") return "pix";
  if (payment_type === "debit_card") return "debito";
  if (payment_type === "credit_card") {
    const n = normInstallments(installments);
    if (n === null) return null;
    if (n === 1) return "credito_avista";
    if (n <= 3) return "credito_3x";
    return "credito_parcelado";
  }
  return null;
}

const METHOD_LABEL: Record<string, string> = {
  pix: "PIX",
  credit_card: "Cartão de Crédito",
  boleto: "Boleto",
};

const METHOD_SHORT: Record<string, string> = {
  pix: "PIX",
  credit_card: "Cartão",
  boleto: "Boleto",
};

/**
 * Rótulo do detalhe do pedido no admin.
 * Ex.: "Cartão de crédito — 3x sem juros", "Cartão de crédito — 6x",
 * "Cartão de crédito — à vista", "Débito", "PIX".
 * Sem o dado (pedido antigo): só a forma de pagamento, como antes.
 */
export function paymentLabelDetalhado(
  payment_method: string | null | undefined,
  payment_type: string | null | undefined,
  installments: number | null | undefined
): string | undefined {
  const opt = paymentOptionParaErp(payment_method, payment_type, installments);
  const n = normInstallments(installments);
  switch (opt) {
    case "pix": return "PIX";
    case "debito": return "Débito";
    case "credito_avista": return "Cartão de crédito — à vista";
    case "credito_3x": return `Cartão de crédito — ${n}x sem juros`;
    case "credito_parcelado": return `Cartão de crédito — ${n}x`;
    default: return payment_method ? METHOD_LABEL[payment_method] ?? payment_method : undefined;
  }
}

/**
 * Rótulo curto da lista de pedidos. Ex.: "Crédito 3x", "Crédito à vista",
 * "Débito", "PIX". Sem o dado: "Cartão"/"PIX"/"Boleto", como antes.
 */
export function paymentLabelCurto(
  payment_method: string | null | undefined,
  payment_type: string | null | undefined,
  installments: number | null | undefined
): string {
  const opt = paymentOptionParaErp(payment_method, payment_type, installments);
  const n = normInstallments(installments);
  switch (opt) {
    case "pix": return "PIX";
    case "debito": return "Débito";
    case "credito_avista": return "Crédito à vista";
    case "credito_3x":
    case "credito_parcelado": return `Crédito ${n}x`;
    default: return payment_method ? METHOD_SHORT[payment_method] ?? payment_method : "—";
  }
}
