// Recálculo do pedido de atacado no ADMIN (troca da forma de pagamento) e
// montagem dos dados da tela. Server-only: o navegador só envia a nova forma e
// a escolha sobre preços editados à mão; as contas são feitas aqui.
import { getAtacadoConfig } from "@/lib/atacado/config";
import { FORMAS_PAGAMENTO, precoComDesconto, type DescontosAtacado, type FormaPagamentoAtacado } from "@/lib/atacado/pricing";
import type { WholesaleOrderAdmin, WholesaleOrderItemAdmin } from "@/lib/atacado/pedidos";

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Percentuais do pedido (snapshot da criação); sem snapshot, os atuais de atacado_descontos. */
export async function descontosDoPedido(order: Pick<WholesaleOrderAdmin, "discount_snapshot">): Promise<DescontosAtacado> {
  if (order.discount_snapshot) return order.discount_snapshot;
  return (await getAtacadoConfig()).descontos;
}

const rotuloItem = (it: WholesaleOrderItemAdmin) =>
  `${it.product_name}${it.color || it.size ? ` (${[it.color, it.size].filter(Boolean).join(", ")})` : ""}`;

export interface PlanoTroca {
  forma: FormaPagamentoAtacado;
  itens: { id: string; unit_price: number; total_price: number; price_overridden: boolean; mudou: boolean }[];
  editados: number; // itens com preço editado à mão (e preço bruto disponível)
  semBase: string[]; // itens de pedido antigo, sem preço bruto: ficam como estavam
  totalAntigo: { itens: number; geral: number };
  totalNovo: { itens: number; geral: number };
}

/**
 * Regras da troca:
 *  a) price_overridden = false e base_unit_price preenchido → unit_price = base
 *     com o desconto da NOVA forma (arredondado a centavos);
 *  b) price_overridden = true → mantém o preço editado, a menos que
 *     recalcularEditados (aí recalcula e limpa a marca);
 *  c) sem base_unit_price (pedido antigo) → não recalcula, só avisa;
 *  d) subtotais e totais recalculados; frete e status ficam.
 */
export function planejarTrocaPagamento(
  order: WholesaleOrderAdmin,
  forma: FormaPagamentoAtacado,
  descontos: DescontosAtacado,
  recalcularEditados: boolean
): PlanoTroca {
  const semBase: string[] = [];
  let editados = 0;
  const itens = order.items.map((it) => {
    const manter = { id: it.id, unit_price: it.unit_price, total_price: r2(it.unit_price * it.quantity), price_overridden: it.price_overridden, mudou: false };
    if (it.base_unit_price == null) {
      semBase.push(rotuloItem(it));
      return manter;
    }
    if (it.price_overridden) {
      editados++;
      if (!recalcularEditados) return manter;
    }
    const unit = precoComDesconto(it.base_unit_price, forma, descontos);
    return {
      id: it.id,
      unit_price: unit,
      total_price: r2(unit * it.quantity),
      price_overridden: false,
      mudou: unit !== it.unit_price || it.price_overridden,
    };
  });
  const frete = order.shipping_cost ?? 0;
  const itensAntigo = r2(order.items.reduce((s, it) => s + it.unit_price * it.quantity, 0));
  const itensNovo = r2(itens.reduce((s, it) => s + it.total_price, 0));
  return {
    forma,
    itens,
    editados,
    semBase,
    totalAntigo: { itens: itensAntigo, geral: r2(itensAntigo + frete) },
    totalNovo: { itens: itensNovo, geral: r2(itensNovo + frete) },
  };
}

export interface ItemAdminView extends WholesaleOrderItemAdmin {
  // Preço unitário do item em cada forma de pagamento (só valores; a tela soma
  // para a linha "No PIX / No cartão"). Itens editados à mão ou sem preço bruto
  // ficam com o unit_price atual.
  alt_unit: Record<FormaPagamentoAtacado, number>;
}

/** Dados da tela do admin: pedido com preço bruto e preços por forma de pagamento. */
export async function montarPedidoAdmin(order: WholesaleOrderAdmin) {
  const descontos = await descontosDoPedido(order);
  const items: ItemAdminView[] = order.items.map((it) => {
    const alt = {} as Record<FormaPagamentoAtacado, number>;
    for (const f of FORMAS_PAGAMENTO) {
      alt[f.value] = it.base_unit_price != null && !it.price_overridden ? precoComDesconto(it.base_unit_price, f.value, descontos) : it.unit_price;
    }
    return { ...it, alt_unit: alt };
  });
  const { discount_snapshot: _snapshot, ...rest } = order;
  void _snapshot; // os percentuais ficam no servidor: a tela só recebe valores
  return { ...rest, items };
}
