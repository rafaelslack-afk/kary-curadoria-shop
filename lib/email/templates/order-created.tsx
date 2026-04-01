import * as React from "react";

interface OrderItem {
  name: string;
  variant?: string;
  quantity: number;
  unit_price: number;
}

interface OrderCreatedProps {
  orderNumber: string;
  customerName: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  paymentMethod: string;
  pixCode?: string;
  boletoUrl?: string;
  boletoBarcode?: string;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const PAYMENT_LABELS: Record<string, string> = {
  pix: "Pix",
  boleto: "Boleto Bancário",
  credit_card: "Cartão de Crédito",
};

export function OrderCreatedEmail({
  orderNumber,
  customerName,
  items,
  subtotal,
  shippingCost,
  discount,
  total,
  paymentMethod,
  pixCode,
  boletoUrl,
  boletoBarcode,
}: OrderCreatedProps) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://karycuradoria.com.br";

  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Pedido #{orderNumber} recebido</title>
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: "#f5f1ea", fontFamily: "Georgia, serif" }}>
        <table width="100%" cellPadding={0} cellSpacing={0} style={{ backgroundColor: "#f5f1ea" }}>
          <tbody>
            <tr>
              <td align="center" style={{ padding: "40px 16px" }}>
                <table width="600" cellPadding={0} cellSpacing={0} style={{ maxWidth: 600, width: "100%" }}>
                  {/* Header */}
                  <tbody>
                    <tr>
                      <td style={{ backgroundColor: "#5C3317", padding: "32px 40px", textAlign: "center", borderRadius: "8px 8px 0 0" }}>
                        <p style={{ margin: 0, color: "#EDE8DC", fontSize: 12, letterSpacing: 4, textTransform: "uppercase" }}>
                          Kary Curadoria
                        </p>
                        <h1 style={{ margin: "8px 0 0", color: "#EDE8DC", fontSize: 28, fontWeight: 400 }}>
                          Pedido Recebido!
                        </h1>
                      </td>
                    </tr>

                    {/* Body */}
                    <tr>
                      <td style={{ backgroundColor: "#FFFFFF", padding: "40px", borderRadius: "0 0 8px 8px" }}>
                        <p style={{ margin: "0 0 24px", color: "#5C3317", fontSize: 16 }}>
                          Olá, <strong>{customerName}</strong>!
                        </p>
                        <p style={{ margin: "0 0 24px", color: "#5C3317", fontSize: 15, lineHeight: 1.6 }}>
                          Recebemos seu pedido <strong>#{orderNumber}</strong> e ele já está sendo processado. Em breve você receberá uma confirmação de pagamento.
                        </p>

                        {/* Items */}
                        <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse", marginBottom: 24 }}>
                          <thead>
                            <tr style={{ backgroundColor: "#EDE8DC" }}>
                              <th style={{ padding: "10px 12px", textAlign: "left", color: "#5C3317", fontSize: 13, fontWeight: 600 }}>Produto</th>
                              <th style={{ padding: "10px 12px", textAlign: "center", color: "#5C3317", fontSize: 13, fontWeight: 600 }}>Qtd</th>
                              <th style={{ padding: "10px 12px", textAlign: "right", color: "#5C3317", fontSize: 13, fontWeight: 600 }}>Valor</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item, i) => (
                              <tr key={i} style={{ borderBottom: "1px solid #EDE8DC" }}>
                                <td style={{ padding: "12px", color: "#5C3317", fontSize: 14 }}>
                                  {item.name}
                                  {item.variant && <span style={{ color: "#B89070", fontSize: 12, display: "block" }}>{item.variant}</span>}
                                </td>
                                <td style={{ padding: "12px", color: "#5C3317", fontSize: 14, textAlign: "center" }}>{item.quantity}</td>
                                <td style={{ padding: "12px", color: "#5C3317", fontSize: 14, textAlign: "right" }}>{formatCurrency(item.unit_price * item.quantity)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* Totals */}
                        <table width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: 32 }}>
                          <tbody>
                            <tr>
                              <td style={{ color: "#B89070", fontSize: 14, paddingBottom: 6 }}>Subtotal</td>
                              <td style={{ color: "#5C3317", fontSize: 14, textAlign: "right", paddingBottom: 6 }}>{formatCurrency(subtotal)}</td>
                            </tr>
                            <tr>
                              <td style={{ color: "#B89070", fontSize: 14, paddingBottom: 6 }}>Frete</td>
                              <td style={{ color: "#5C3317", fontSize: 14, textAlign: "right", paddingBottom: 6 }}>{shippingCost > 0 ? formatCurrency(shippingCost) : "Grátis"}</td>
                            </tr>
                            {discount > 0 && (
                              <tr>
                                <td style={{ color: "#B89070", fontSize: 14, paddingBottom: 6 }}>Desconto</td>
                                <td style={{ color: "#A0622A", fontSize: 14, textAlign: "right", paddingBottom: 6 }}>- {formatCurrency(discount)}</td>
                              </tr>
                            )}
                            <tr style={{ borderTop: "2px solid #EDE8DC" }}>
                              <td style={{ color: "#5C3317", fontSize: 16, fontWeight: 700, paddingTop: 10 }}>Total</td>
                              <td style={{ color: "#5C3317", fontSize: 16, fontWeight: 700, textAlign: "right", paddingTop: 10 }}>{formatCurrency(total)}</td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Payment info */}
                        <div style={{ backgroundColor: "#EDE8DC", borderRadius: 8, padding: "20px 24px", marginBottom: 32 }}>
                          <p style={{ margin: "0 0 8px", color: "#5C3317", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
                            Pagamento: {PAYMENT_LABELS[paymentMethod] ?? paymentMethod}
                          </p>

                          {paymentMethod === "pix" && pixCode && (
                            <>
                              <p style={{ margin: "0 0 8px", color: "#5C3317", fontSize: 14 }}>
                                Copie o código Pix abaixo e pague no app do seu banco:
                              </p>
                              <div style={{ backgroundColor: "#FFFFFF", borderRadius: 4, padding: "10px 14px", wordBreak: "break-all", fontSize: 12, color: "#5C3317", fontFamily: "monospace" }}>
                                {pixCode}
                              </div>
                            </>
                          )}

                          {paymentMethod === "boleto" && boletoUrl && (
                            <>
                              {boletoBarcode && (
                                <p style={{ margin: "0 0 8px", color: "#5C3317", fontSize: 12, fontFamily: "monospace", wordBreak: "break-all" }}>
                                  {boletoBarcode}
                                </p>
                              )}
                              <a
                                href={boletoUrl}
                                style={{ display: "inline-block", backgroundColor: "#A0622A", color: "#FFFFFF", textDecoration: "none", borderRadius: 4, padding: "10px 20px", fontSize: 14, marginTop: 8 }}
                              >
                                Visualizar Boleto
                              </a>
                            </>
                          )}

                          {paymentMethod === "credit_card" && (
                            <p style={{ margin: 0, color: "#5C3317", fontSize: 14 }}>
                              Seu pagamento está sendo processado. Você receberá uma confirmação em breve.
                            </p>
                          )}
                        </div>

                        {/* Track button */}
                        <div style={{ textAlign: "center", marginBottom: 32 }}>
                          <a
                            href={`${siteUrl}/rastrear?pedido=${orderNumber}`}
                            style={{ display: "inline-block", backgroundColor: "#5C3317", color: "#EDE8DC", textDecoration: "none", borderRadius: 4, padding: "12px 32px", fontSize: 15 }}
                          >
                            Acompanhar Pedido
                          </a>
                        </div>

                        <p style={{ margin: 0, color: "#B89070", fontSize: 13, textAlign: "center" }}>
                          Dúvidas? Entre em contato pelo WhatsApp{" "}
                          <a href="https://wa.me/5511940224088" style={{ color: "#A0622A" }}>
                            (11) 94022-4088
                          </a>
                        </p>
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
