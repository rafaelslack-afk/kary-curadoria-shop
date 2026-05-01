import * as React from "react";

interface OrderItem {
  name: string;
  variant?: string; // tamanho
  color?: string;   // cor
  quantity: number;
  unit_price: number;
}

interface PaymentConfirmedProps {
  orderNumber: string;
  customerName: string;
  items: OrderItem[];
  total: number;
}

const BRAND = "#2C1A0E";
const ACCENT = "#A0622A";
const CREAM = "#F5F0E8";
const MUTED = "#8B6B4A";
const WHITE = "#FFFFFF";
const LINE = "#E8DDD0";
const GREEN = "#2D7A4F";

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function PaymentConfirmedEmail({ orderNumber, customerName, items, total }: PaymentConfirmedProps) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://karycuradoria.com.br";
  const trackUrl = `${siteUrl}/rastrear?pedido=${orderNumber}`;
  const firstName = customerName.split(" ")[0];

  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, padding: 0, backgroundColor: CREAM, fontFamily: "Georgia, 'Times New Roman', serif", WebkitTextSizeAdjust: "100%" }}>

        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ backgroundColor: CREAM }}>
          <tbody>
            <tr>
              <td align="center" style={{ padding: "40px 16px 48px" }}>
                <table role="presentation" cellPadding={0} cellSpacing={0} style={{ width: "100%", maxWidth: 580 }}>
                  <tbody>

                    {/* HEADER */}
                    <tr>
                      <td style={{ backgroundColor: BRAND, borderRadius: "10px 10px 0 0", padding: "36px 40px 32px" }}>
                        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
                          <tbody>
                            <tr>
                              <td align="center">
                                <p style={{ margin: 0, fontFamily: "Georgia, serif", fontSize: 26, fontWeight: 400, letterSpacing: 8, color: CREAM, textTransform: "uppercase" }}>
                                  Kary
                                </p>
                                <p style={{ margin: "2px 0 0", fontFamily: "Arial, sans-serif", fontSize: 9, fontWeight: 400, letterSpacing: 6, color: ACCENT, textTransform: "uppercase" }}>
                                  CURADORIA
                                </p>
                                <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ marginTop: 20 }}>
                                  <tbody>
                                    <tr>
                                      <td style={{ height: 1, backgroundColor: ACCENT, opacity: 0.5 }} />
                                    </tr>
                                  </tbody>
                                </table>

                                {/* Ícone de check */}
                                <table role="presentation" cellPadding={0} cellSpacing={0} style={{ margin: "20px auto 0" }}>
                                  <tbody>
                                    <tr>
                                      <td align="center" style={{ width: 52, height: 52, backgroundColor: GREEN, borderRadius: "50%", verticalAlign: "middle" }}>
                                        <span style={{ color: WHITE, fontSize: 24, lineHeight: "52px" }}>✓</span>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>

                                <p style={{ margin: "14px 0 0", fontFamily: "Arial, sans-serif", fontSize: 11, letterSpacing: 3, color: CREAM, textTransform: "uppercase", opacity: 0.75 }}>
                                  Pagamento Aprovado
                                </p>
                                <p style={{ margin: "10px 0 0", fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 400, color: WHITE, lineHeight: 1.2 }}>
                                  Pedido confirmado!
                                </p>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>

                    {/* BODY */}
                    <tr>
                      <td style={{ backgroundColor: WHITE, padding: "40px 40px 36px", borderRadius: "0 0 10px 10px" }}>

                        <p style={{ margin: "0 0 8px", fontFamily: "Georgia, serif", fontSize: 18, color: BRAND }}>
                          Boa notícia, {firstName}! 🎉
                        </p>
                        <p style={{ margin: "0 0 8px", fontFamily: "Arial, sans-serif", fontSize: 14, lineHeight: 1.7, color: MUTED }}>
                          Seu pagamento do pedido <strong style={{ color: BRAND }}>#{orderNumber}</strong> foi confirmado com sucesso!
                        </p>
                        <p style={{ margin: "0 0 28px", fontFamily: "Arial, sans-serif", fontSize: 14, lineHeight: 1.7, color: MUTED }}>
                          Estamos separando seu pedido com carinho 💛 e você receberá o código de rastreamento assim que for despachado.
                        </p>

                        {/* Timeline visual */}
                        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: 32 }}>
                          <tbody>
                            <tr>
                              <td style={{ backgroundColor: CREAM, borderRadius: 6, border: `1px solid ${LINE}`, padding: "20px 24px" }}>
                                <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
                                  <tbody>
                                    {[
                                      { label: "Pedido recebido", done: true },
                                      { label: "Pagamento aprovado", done: true },
                                      { label: "Em preparação", done: false },
                                      { label: "Enviado", done: false },
                                    ].map((step, i) => (
                                      <tr key={i}>
                                        <td style={{ paddingBottom: i < 3 ? 12 : 0 }}>
                                          <table role="presentation" cellPadding={0} cellSpacing={0}>
                                            <tbody>
                                              <tr>
                                                <td style={{ width: 22, verticalAlign: "top", paddingTop: 1 }}>
                                                  <span style={{
                                                    display: "inline-block",
                                                    width: 18,
                                                    height: 18,
                                                    borderRadius: "50%",
                                                    backgroundColor: step.done ? GREEN : LINE,
                                                    textAlign: "center",
                                                    lineHeight: "18px",
                                                    fontSize: 11,
                                                    color: step.done ? WHITE : MUTED,
                                                    fontFamily: "Arial, sans-serif",
                                                  }}>
                                                    {step.done ? "✓" : "○"}
                                                  </span>
                                                </td>
                                                <td style={{ paddingLeft: 10, fontFamily: "Arial, sans-serif", fontSize: 13, color: step.done ? BRAND : MUTED, fontWeight: step.done ? 600 : 400 }}>
                                                  {step.label}
                                                </td>
                                              </tr>
                                            </tbody>
                                          </table>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Itens */}
                        <p style={{ margin: "0 0 12px", fontFamily: "Arial, sans-serif", fontSize: 10, letterSpacing: 2, color: MUTED, textTransform: "uppercase" }}>
                          Itens do Pedido
                        </p>
                        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse", marginBottom: 28 }}>
                          <thead>
                            <tr style={{ backgroundColor: CREAM }}>
                              <th style={{ padding: "10px 14px", textAlign: "left", fontFamily: "Arial, sans-serif", fontSize: 11, fontWeight: 600, color: BRAND, letterSpacing: 1, textTransform: "uppercase", borderBottom: `2px solid ${LINE}` }}>
                                Produto
                              </th>
                              <th style={{ padding: "10px 8px", textAlign: "center", fontFamily: "Arial, sans-serif", fontSize: 11, fontWeight: 600, color: BRAND, letterSpacing: 1, textTransform: "uppercase", borderBottom: `2px solid ${LINE}`, whiteSpace: "nowrap" }}>
                                Qtd
                              </th>
                              <th style={{ padding: "10px 14px", textAlign: "right", fontFamily: "Arial, sans-serif", fontSize: 11, fontWeight: 600, color: BRAND, letterSpacing: 1, textTransform: "uppercase", borderBottom: `2px solid ${LINE}`, whiteSpace: "nowrap" }}>
                                Valor
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item, i) => (
                              <tr key={i} style={{ backgroundColor: i % 2 === 0 ? WHITE : "#FDFAF6" }}>
                                <td style={{ padding: "13px 14px", fontFamily: "Arial, sans-serif", fontSize: 14, color: BRAND, borderBottom: `1px solid ${LINE}` }}>
                                  {item.name}
                                  {(item.color || item.variant) ? (
                                    <span style={{ display: "block", fontSize: 12, color: MUTED, marginTop: 3 }}>
                                      {[item.color, item.variant ? `Tam. ${item.variant}` : null]
                                        .filter(Boolean).join(" · ")}
                                    </span>
                                  ) : null}
                                </td>
                                <td style={{ padding: "13px 8px", fontFamily: "Arial, sans-serif", fontSize: 14, color: BRAND, textAlign: "center", borderBottom: `1px solid ${LINE}` }}>
                                  {item.quantity}
                                </td>
                                <td style={{ padding: "13px 14px", fontFamily: "Arial, sans-serif", fontSize: 14, color: BRAND, textAlign: "right", borderBottom: `1px solid ${LINE}`, whiteSpace: "nowrap" }}>
                                  {fmt(item.unit_price * item.quantity)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td colSpan={2} style={{ padding: "14px 14px 14px", fontFamily: "Georgia, serif", fontSize: 15, color: BRAND, borderTop: `2px solid ${LINE}` }}>
                                Total pago
                              </td>
                              <td style={{ padding: "14px 14px 14px", fontFamily: "Georgia, serif", fontSize: 17, color: BRAND, textAlign: "right", borderTop: `2px solid ${LINE}`, whiteSpace: "nowrap" }}>
                                {fmt(total)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>

                        {/* CTA */}
                        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: 32 }}>
                          <tbody>
                            <tr>
                              <td align="center">
                                <a href={trackUrl} style={{ display: "inline-block", backgroundColor: ACCENT, color: WHITE, textDecoration: "none", fontFamily: "Arial, sans-serif", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", padding: "15px 40px", borderRadius: 4 }}>
                                  Acompanhar Meu Pedido
                                </a>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: 24 }}>
                          <tbody>
                            <tr>
                              <td style={{ height: 1, backgroundColor: LINE }} />
                            </tr>
                          </tbody>
                        </table>

                        <p style={{ margin: 0, fontFamily: "Arial, sans-serif", fontSize: 12, color: MUTED, textAlign: "center", lineHeight: 1.7 }}>
                          Dúvidas? Fale conosco pelo WhatsApp{" "}
                          <a href="https://wa.me/5511940224088" style={{ color: ACCENT, textDecoration: "none" }}>
                            (11) 94022-4088
                          </a>
                          {" "}ou responda este e-mail.
                        </p>
                      </td>
                    </tr>

                    {/* FOOTER */}
                    <tr>
                      <td align="center" style={{ padding: "28px 16px 0" }}>
                        <p style={{ margin: "0 0 4px", fontFamily: "Georgia, serif", fontSize: 14, letterSpacing: 3, color: BRAND, textTransform: "uppercase" }}>
                          Kary Curadoria
                        </p>
                        <p style={{ margin: "0 0 4px", fontFamily: "Arial, sans-serif", fontSize: 11, color: MUTED }}>
                          Rua Min. Firmino Whitaker, 49/55 · Box 142 · Brás, São Paulo – SP
                        </p>
                        <p style={{ margin: 0, fontFamily: "Arial, sans-serif", fontSize: 11, color: MUTED }}>
                          © {new Date().getFullYear()} Kary Curadoria. Todos os direitos reservados.
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
