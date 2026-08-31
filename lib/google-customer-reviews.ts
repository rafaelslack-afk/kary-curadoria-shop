// Google Customer Reviews (Avaliações do Consumidor) — Merchant ID 5767707063.
//
// Helper de data usado exclusivamente pelo opt-in snippet renderizado na
// página de confirmação de pedido. Não usar para nenhum outro cálculo de
// prazo de entrega no site (aquele fluxo já existe em outros lugares e não
// deve ser tocado por esta integração).

export function calcularDataEntregaEstimada(
  dataConfirmacaoPagamento: Date,
  prazoDiasUteis: number
): string {
  const data = new Date(dataConfirmacaoPagamento);
  let diasAdicionados = 0;

  while (diasAdicionados < prazoDiasUteis) {
    data.setDate(data.getDate() + 1);
    const diaSemana = data.getDay();
    // Pular sábado (6) e domingo (0)
    if (diaSemana !== 0 && diaSemana !== 6) {
      diasAdicionados++;
    }
  }

  // Formato YYYY-MM-DD exigido pelo Google
  return data.toISOString().split("T")[0];
}
