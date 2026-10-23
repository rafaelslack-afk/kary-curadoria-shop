// Regra de preço do atacado — ÚNICA fonte, usada no catálogo, no carrinho, no
// envio do pedido (servidor) e no admin.
//
// Função pura e isomórfica: NÃO importar nada de @/lib/supabase aqui (este
// arquivo vai para o bundle do navegador).
import { calcularPrecoComPlusSize } from "@/lib/pricing";

export type FormaPagamentoAtacado = "pix" | "credit_card";

export const FORMAS_PAGAMENTO: { value: FormaPagamentoAtacado; label: string }[] = [
  { value: "pix", label: "PIX" },
  { value: "credit_card", label: "Cartão de crédito" },
];

export function labelFormaPagamento(forma: string): string {
  return FORMAS_PAGAMENTO.find((f) => f.value === forma)?.label ?? forma;
}

export function isFormaPagamento(v: unknown): v is FormaPagamentoAtacado {
  return v === "pix" || v === "credit_card";
}

// Descontos em % sobre o preço de varejo, por forma de pagamento
export type DescontosAtacado = Record<FormaPagamentoAtacado, number>;

export interface RegraPrecoAtacado {
  markups: Record<string, number>; // acréscimos plus size (system_config.plus_size_markup)
  descontos: DescontosAtacado;
}

function centavos(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/**
 * Preço unitário de atacado.
 * 1. Parte do preço atual de varejo (products.price — já é o promocional
 *    quando há promoção; original_price é só o "de" riscado).
 * 2. G1/G2/G3: soma o acréscimo plus size (calcularPrecoComPlusSize).
 * 3. Aplica o desconto da forma de pagamento sobre o valor resultante.
 * 4. Arredonda para centavos.
 * Ex.: R$ 179,90 no G1 (+40) = 219,90; PIX 20% → 175,92.
 */
export function precoAtacado(
  precoVarejo: number,
  tamanho: string,
  formaPagamento: FormaPagamentoAtacado,
  regra: RegraPrecoAtacado
): number {
  const comPlusSize = calcularPrecoComPlusSize(Number(precoVarejo), tamanho, regra.markups);
  const desconto = Math.min(Math.max(Number(regra.descontos[formaPagamento]) || 0, 0), 100);
  return centavos(comPlusSize * (1 - desconto / 100));
}

/**
 * Preço BRUTO de atacado: preço de varejo atual (promocional, se houver) já com
 * o acréscimo plus size e SEM desconto. Guardado em wholesale_order_items
 * (base_unit_price) só para o admin; nunca exibir em área pública.
 */
export function precoBrutoAtacado(precoVarejo: number, tamanho: string, markups: Record<string, number>): number {
  return centavos(calcularPrecoComPlusSize(Number(precoVarejo), tamanho, markups));
}

/** Aplica o desconto da forma de pagamento ao preço bruto (mesma conta de precoAtacado). */
export function precoComDesconto(
  precoBruto: number,
  formaPagamento: FormaPagamentoAtacado,
  descontos: DescontosAtacado
): number {
  const desconto = Math.min(Math.max(Number(descontos[formaPagamento]) || 0, 0), 100);
  return centavos(Number(precoBruto) * (1 - desconto / 100));
}

// ── Plus size no card (mesmo padrão de rótulo dos cards do assistente) ──────

export const PLUS_SIZES = ["G1", "G2", "G3"];

export function isPlusSize(tamanho: string): boolean {
  return PLUS_SIZES.includes(tamanho.trim().toUpperCase());
}

// "G1" · "G1 e G2" · "G1 a G3" (só os tamanhos que a peça tem)
export function rotuloPlusSize(tamanhos: string[]): string {
  const sizes = PLUS_SIZES.filter((s) => tamanhos.some((t) => t.trim().toUpperCase() === s));
  if (sizes.length === PLUS_SIZES.length) return `${sizes[0]} a ${sizes[sizes.length - 1]}`;
  return sizes.join(" e ");
}

/**
 * Preço de atacado dos tamanhos plus size ativos da peça, para o card.
 * `from`: preços diferentes entre esses tamanhos → "a partir de".
 */
export function precoPlusSizeCard(
  precoVarejo: number,
  tamanhosAtivos: string[],
  formaPagamento: FormaPagamentoAtacado,
  regra: RegraPrecoAtacado
): { label: string; price: number; from: boolean } | null {
  const sizes = PLUS_SIZES.filter((s) => tamanhosAtivos.some((t) => t.trim().toUpperCase() === s));
  if (sizes.length === 0) return null;
  const prices = sizes.map((s) => precoAtacado(precoVarejo, s, formaPagamento, regra));
  const price = Math.min(...prices);
  const base = precoAtacado(precoVarejo, "", formaPagamento, regra);
  const from = new Set(prices).size > 1;
  if (price === base && !from) return null;
  return { label: rotuloPlusSize(sizes), price, from };
}
