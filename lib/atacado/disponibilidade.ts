// Peças que saíram do atacado (atacado_enabled = false no cadastro, ou peça
// inativa). Mensagem única para o carrinho e para a API de pedidos.
// Puro: seguro para o navegador.

export function mensagemForaDoAtacado(nome: string): string {
  return `A peça ${nome} não está mais disponível no atacado. Remova-a do pedido para continuar.`;
}
