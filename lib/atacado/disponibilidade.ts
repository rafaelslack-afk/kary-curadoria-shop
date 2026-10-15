// Peças que saíram do atacado (atacado_enabled = false no cadastro, ou peça
// inativa). Mensagem única para o carrinho e para a API de pedidos.
// Puro: seguro para o navegador.

export function mensagemForaDoAtacado(nome: string): string {
  return `A peça ${nome} não está mais disponível no atacado. Remova-a do pedido para continuar.`;
}

// Regra ÚNICA de variante disponível no atacado: ativa E stock_qty > 0 (o
// "Real" do cadastro de estoque, igual com ou sem sync do ERP; nunca o
// "Disponível loja" e nunca o STOCK_BUFFER). A QUANTIDADE pedida não é
// limitada pelo estoque, e o estoque nunca é exibido no atacado.
export function varianteDisponivelAtacado(v: { active: boolean; stock_qty: number | string | null }): boolean {
  return v.active === true && Number(v.stock_qty ?? 0) > 0;
}

export function variantesDisponiveisAtacado<T extends { active: boolean; stock_qty: number | string | null }>(
  variantes: T[] | null | undefined
): T[] {
  return (variantes ?? []).filter(varianteDisponivelAtacado);
}

export function mensagemVarianteIndisponivel(nome: string, cor: string | null, tamanho: string): string {
  return `A peça ${nome} (${cor ?? "Única"}, ${tamanho}) não está mais disponível. Remova-a do pedido para continuar.`;
}

export const AVISO_VARIANTE_INDISPONIVEL = "Esta cor/tamanho não está mais disponível";
