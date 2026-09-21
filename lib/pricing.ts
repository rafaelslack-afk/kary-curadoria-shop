// Cálculo de preço com acréscimo de plus size (G1/G2/G3).
//
// Função pura e isomórfica — usada tanto no client (PDP, carrinho) quanto
// no server (validação de preço em app/api/orders/create). É a ÚNICA fonte
// de cálculo: nenhum outro ponto do código deve somar o acréscimo "na mão".
//
// NÃO importar nada de @/lib/supabase aqui — este arquivo é importado por
// componentes "use client" e precisa continuar seguro para bundle client-side.
export function calcularPrecoComPlusSize(
  precoBase: number,
  tamanho: string,
  markups: Record<string, number>
): number {
  const acrescimo = markups[tamanho] || 0;
  return precoBase + acrescimo;
}
