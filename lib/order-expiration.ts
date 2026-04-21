/**
 * Regras centralizadas de expiração de pedidos por método de pagamento.
 *
 * Fonte única da verdade para cancelamento automático e badges de alerta
 * no admin. Consultada pelo cron (`/api/cron/cancel-expired-orders`) e
 * pela listagem de pedidos (`/admin/pedidos`).
 *
 * Valores em MINUTOS desde `orders.created_at`:
 * - pix: 60              → após 1h sem pagamento, cancela
 * - credit_card: 0       → nunca fica pending (aprovação síncrona no checkout)
 * - debit_card: 0        → idem
 * - boleto: 7200         → 5 dias (prazo comercial do MP/Bradesco)
 *
 * Se o método não estiver no mapa, `isOrderExpired` retorna `false`
 * (pedido nunca expira automaticamente).
 */

export const EXPIRATION_RULES: Record<string, number> = {
  pix: 60,
  credit_card: 0,
  debit_card: 0,
  boleto: 7200,
};

/**
 * Minutos decorridos desde `createdAt` até agora.
 */
export function minutesSince(createdAt: string | Date): number {
  const created = typeof createdAt === "string" ? new Date(createdAt).getTime() : createdAt.getTime();
  return (Date.now() - created) / 1000 / 60;
}

/**
 * Verifica se um pedido pendente ultrapassou o prazo de expiração
 * definido para seu método de pagamento.
 *
 * @returns `true` se o pedido deve ser cancelado.
 * Para métodos não mapeados ou com `minutes === 0`, sempre retorna `false`
 * (credit_card/debit_card: nunca fica pending por design).
 */
export function isOrderExpired(
  paymentMethod: string | null | undefined,
  createdAt: string | Date
): boolean {
  if (!paymentMethod) return false;
  const limit = EXPIRATION_RULES[paymentMethod];
  if (!limit || limit <= 0) return false;
  return minutesSince(createdAt) > limit;
}

/**
 * Limiares (em minutos) a partir dos quais exibimos um badge de alerta
 * no admin, ANTES da expiração definitiva, para a operação agir.
 */
export const ALERT_THRESHOLDS: Record<string, { warn: number; label: string }> = {
  pix: { warn: 30, label: "Pix expirando" },
  boleto: { warn: 5760, label: "Boleto vencendo" }, // 4 dias
};

export interface PendingAlert {
  label: string;
  color: "yellow" | "orange" | "red";
}

/**
 * Retorna um alerta visual para pedidos pending que estão próximos do prazo
 * final (ou já estouraram o prazo, mas o cron ainda não rodou).
 *
 * @param status Status atual do pedido
 * @param paymentMethod Método de pagamento
 * @param createdAt Data de criação
 * @returns Badge com label e cor, ou `null` se não há alerta.
 */
export function getPendingAlert(
  status: string,
  paymentMethod: string | null | undefined,
  createdAt: string | Date
): PendingAlert | null {
  if (status !== "pending" || !paymentMethod) return null;
  const elapsed = minutesSince(createdAt);

  // Já passou do prazo final → vermelho (cron vai pegar no próximo ciclo)
  if (isOrderExpired(paymentMethod, createdAt)) {
    return { label: "Expirado", color: "red" };
  }

  // Próximo do prazo → amarelo/laranja
  const threshold = ALERT_THRESHOLDS[paymentMethod];
  if (threshold && elapsed > threshold.warn) {
    return {
      label: threshold.label,
      color: paymentMethod === "boleto" ? "orange" : "yellow",
    };
  }

  return null;
}
