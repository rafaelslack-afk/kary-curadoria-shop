import * as React from "react";

interface OrderCancelledProps {
  orderNumber: string;
  customerName: string;
  total: number;
  reason?: string;
  /**
   * `true` quando o pedido já havia sido pago antes do cancelamento
   * (fluxo de estorno). `false` quando o pagamento nunca foi identificado
   * — ex.: PIX/Boleto expirados, cancelamento automático pelo cron.
   * Default: `true` (mantém compatibilidade com comportamento antigo).
   */
  wasAlreadyPaid?: boolean;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function OrderCancelledEmail({
  orderNumber,
  customerName,
  total,
  reason,
  wasAlreadyPaid = true,
}: OrderCancelledProps) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://karycuradoria.com.br";

  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, padding: 0, backgroundColor: "#f5f1ea", fontFamily: "Georgia, serif" }}>
        <table width="100%" cellPadding={0} cellSpacing={0} style={{ backgroundColor: "#f5f1ea" }}>
          <tbody>
            <tr>
              <td align="center" style={{ padding: "40px 16px" }}>
                <table width="600" cellPadding={0} cellSpacing={0} style={{ maxWidth: 600, width: "100%" }}>
                  <tbody>
                    {/* Header */}
                    <tr>
                      <td style={{ backgroundColor: "#5C3317", padding: "32px 40px", textAlign: "center", borderRadius: "8px 8px 0 0" }}>
                        <p style={{ margin: 0, color: "#EDE8DC", fontSize: 12, letterSpacing: 4, textTransform: "uppercase" }}>
                          Kary Curadoria
                        </p>
                        <h1 style={{ margin: "16px 0 0", color: "#EDE8DC", fontSize: 26, fontWeight: 400 }}>
                          Pedido Cancelado
                        </h1>
                      </td>
                    </tr>

                    {/* Body */}
                    <tr>
                      <td style={{ backgroundColor: "#FFFFFF", padding: "40px", borderRadius: "0 0 8px 8px" }}>
                        <p style={{ margin: "0 0 16px", color: "#5C3317", fontSize: 16 }}>
                          Olá, <strong>{customerName}</strong>.
                        </p>
                        <p style={{ margin: "0 0 24px", color: "#5C3317", fontSize: 15, lineHeight: 1.6 }}>
                          Informamos que seu pedido <strong>#{orderNumber}</strong> foi cancelado.
                        </p>

                        {reason && (
                          <div style={{ backgroundColor: "#EDE8DC", borderLeft: "4px solid #B89070", borderRadius: 4, padding: "16px 20px", marginBottom: 24 }}>
                            <p style={{ margin: 0, color: "#5C3317", fontSize: 14 }}>
                              <strong>Motivo:</strong> {reason}
                            </p>
                          </div>
                        )}

                        {/* Bloco condicional: estorno vs. pagamento não identificado */}
                        {wasAlreadyPaid ? (
                          <div style={{ backgroundColor: "#EDE8DC", borderRadius: 8, padding: "20px 24px", marginBottom: 32 }}>
                            <p style={{ margin: "0 0 8px", color: "#5C3317", fontSize: 14, fontWeight: 600 }}>
                              Informações sobre reembolso
                            </p>
                            <p style={{ margin: 0, color: "#5C3317", fontSize: 14, lineHeight: 1.6 }}>
                              Caso tenha efetuado o pagamento de <strong>{formatCurrency(total)}</strong>, o estorno será realizado em até 5 dias úteis no método de pagamento utilizado. Em caso de dúvidas, entre em contato conosco.
                            </p>
                          </div>
                        ) : (
                          <div style={{ backgroundColor: "#EDE8DC", borderRadius: 8, padding: "20px 24px", marginBottom: 32 }}>
                            <p style={{ margin: "0 0 8px", color: "#5C3317", fontSize: 14, fontWeight: 600 }}>
                              Pagamento não identificado
                            </p>
                            <p style={{ margin: 0, color: "#5C3317", fontSize: 14, lineHeight: 1.6 }}>
                              Seu pedido foi cancelado pois o pagamento no valor de <strong>{formatCurrency(total)}</strong> não foi identificado dentro do prazo. Se desejar, você pode realizar um novo pedido em nossa loja.
                            </p>
                          </div>
                        )}

                        {/* CTA */}
                        <p style={{ margin: "0 0 24px", color: "#5C3317", fontSize: 15, lineHeight: 1.6 }}>
                          {wasAlreadyPaid
                            ? "Se o cancelamento foi um engano ou você deseja fazer um novo pedido, acesse nossa loja ou fale conosco pelo WhatsApp."
                            : "Quer finalizar a compra? Escolha novamente suas peças na loja — o estoque permanece disponível até acabar."}
                        </p>

                        <div style={{ textAlign: "center", marginBottom: 16 }}>
                          <a
                            href={siteUrl}
                            style={{ display: "inline-block", backgroundColor: "#5C3317", color: "#EDE8DC", textDecoration: "none", borderRadius: 4, padding: "12px 32px", fontSize: 15, marginRight: 12 }}
                          >
                            Visitar a Loja
                          </a>
                          <a
                            href="https://wa.me/5511940224088"
                            style={{ display: "inline-block", backgroundColor: "#A0622A", color: "#FFFFFF", textDecoration: "none", borderRadius: 4, padding: "12px 32px", fontSize: 15 }}
                          >
                            WhatsApp
                          </a>
                        </div>
                      </td>
                    </tr>

                    {/* Footer */}
                    <tr>
                      <td style={{ textAlign: "center", paddingTop: 24 }}>
                        <p style={{ margin: 0, color: "#B89070", fontSize: 12 }}>
                          © {new Date().getFullYear()} Kary Curadoria — Brás, São Paulo
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}
