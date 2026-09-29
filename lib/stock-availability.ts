// Regra de disponibilidade de uma variante, exatamente como a página de
// produto (PDP) decide o que a cliente pode comprar. Fonte única usada pela
// PDP e pelas ferramentas do assistente virtual, para que o assistente nunca
// diga "esgotado" para algo que a PDP deixa comprar (nem o contrário).
//
// A PDP usa o stock_qty bruto do banco, sem STOCK_BUFFER, e só exibe
// variantes ativas de produtos ativos. O mesmo stock_qty bruto é validado no
// carrinho (/api/products/variants/stock) e na criação do pedido.
// Não aplicar STOCK_BUFFER aqui.

export interface StockVariant {
  stock_qty: number;
  stock_min: number;
}

export type Disponibilidade = "disponível" | "últimas unidades" | "esgotado";

// Tamanho riscado e botão de compra bloqueado na PDP
export function isVariantOutOfStock(v: StockVariant): boolean {
  return v.stock_qty === 0;
}

// Selo "Últimas" na PDP
export function isVariantLowStock(v: StockVariant): boolean {
  return !isVariantOutOfStock(v) && v.stock_qty <= v.stock_min;
}

export function variantAvailability(v: StockVariant): Disponibilidade {
  if (isVariantOutOfStock(v)) return "esgotado";
  if (isVariantLowStock(v)) return "últimas unidades";
  return "disponível";
}

// Resumo de um conjunto de variantes (já filtradas como a PDP: só ativas).
// Sem variantes, a PDP mostra "Produto sem estoque".
export function productAvailability(variants: StockVariant[]): Disponibilidade {
  const buyable = variants.filter((v) => !isVariantOutOfStock(v));
  if (buyable.length === 0) return "esgotado";
  return buyable.every(isVariantLowStock) ? "últimas unidades" : "disponível";
}
