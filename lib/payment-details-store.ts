import { createAdminClient } from "@/lib/supabase/admin";
import { extractPaymentDetails } from "@/lib/payment-option";

/**
 * Grava orders.installments e orders.payment_type a partir da resposta do
 * Mercado Pago. Só LÊ a resposta e GRAVA esses dois campos:
 *   - nunca lança (erro só vai para o log);
 *   - não toca status, valores, estoque nem cobrança;
 *   - campo ausente na resposta não é gravado (fica NULL);
 *   - só preenche pedidos que ainda não têm o dado, para não mexer em
 *     updated_at (usado como data de confirmação) a cada evento repetido do MP.
 */
export async function savePaymentDetails(orderId: string, mpPayment: unknown, source: string): Promise<void> {
  try {
    const { payment_type, installments } = extractPaymentDetails(mpPayment);
    const patch: Record<string, string | number> = {};
    if (payment_type !== null) patch.payment_type = payment_type;
    if (installments !== null) patch.installments = installments;
    if (Object.keys(patch).length === 0) {
      console.warn(`[Pagamento] (${source}) Pedido ${orderId}: resposta do MP sem payment_type_id/installments — nada gravado.`);
      return;
    }

    const { error } = await createAdminClient()
      .from("orders")
      .update(patch)
      .eq("id", orderId)
      .or("installments.is.null,payment_type.is.null");

    if (error) {
      console.error(`[Pagamento] (${source}) Falha ao gravar parcelas do pedido ${orderId}:`, error.message);
    }
  } catch (err) {
    console.error(`[Pagamento] (${source}) Erro ao gravar parcelas do pedido ${orderId}:`, err);
  }
}
