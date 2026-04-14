import * as React from "react";

interface OrderShippedProps {
  orderNumber: string;
  customerName: string;
  trackingCode: string;
  carrier?: string;
}

const BRAND = "#2C1A0E";
const ACCENT = "#A0622A";
const CREAM = "#F5F0E8";
const MUTED = "#8B6B4A";
const WHITE = "#FFFFFF";
const LINE = "#E8DDD0";
const GREEN = "#2D7A4F";

export function OrderShippedEmail({ orderNumber, customerName, trackingCode, carrier }: OrderShippedProps) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://karycuradoria.com.br";
  const trackUrl = `${siteUrl}/rastrear?pedido=${orderNumber}`;
  const correiosUrl = `https://rastreamento.correios.com.br/app/index.php`;
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

                                {/* Ícone de caixa */}
                                <table role="presentation" cellPadding={0} cellSpacing={0} style={{ margin: "20px auto 0" }}>
                                  <tbody>
                                    <tr>
                                      <td align="center" style={{ width: 52, height: 52, backgroundColor: ACCENT, borderRadius: "50%", verticalAlign: "middle" }}>
                                        <span style={{ color: WHITE, fontSize: 22, lineHeight: "52px" }}>📦</span>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>

                                <p style={{ margin: "14px 0 0", fontFamily: "Arial, sans-serif", fontSize: 11, letterSpacing: 3, color: CREAM, textTransform: "uppercase", opacity: 0.75 }}>
                                  Pedido Enviado
                                </p>
                                <p style={{ margin: "10px 0 0", fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 400, color: WHITE, lineHeight: 1.2 }}>
                                  Está a caminho!
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
                          Boa notícia, {firstName}!
                        </p>
                        <p style={{ margin: "0 0 32px", fontFamily: "Arial, sans-serif", fontSize: 14, lineHeight: 1.7, color: MUTED }}>
                          Seu pedido <strong style={{ color: BRAND }}>#{orderNumber}</strong> foi despachado e já está a caminho. Use o código abaixo para acompanhar sua entrega em tempo real.
                        </p>

                        {/* Box de rastreamento */}
                        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: 32 }}>
                          <tbody>
                            <tr>
                              <td style={{ backgroundColor: CREAM, borderRadius: 8, border: `1px solid ${LINE}`, padding: "28px 24px", textAlign: "center" }}>
                                <p style={{ margin: "0 0 10px", fontFamily: "Arial, sans-serif", fontSize: 10, letterSpacing: 3, color: MUTED, textTransform: "uppercase" }}>
                                  Código de Rastreamento
                                </p>
                                <p style={{ margin: "0 0 6px", fontFamily: "'Courier New', monospace", fontSize: 24, fontWeight: 700, color: BRAND, letterSpacing: 3 }}>
                                  {trackingCode}
                                </p>
                                {carrier ? (
                                  <p style={{ margin: "0 0 20px", fontFamily: "Arial, sans-serif", fontSize: 12, color: MUTED }}>
                                    via {carrier}
                                  </p>
                                ) : (
                                  <p style={{ margin: "0 0 20px" }} />
                                )}

                                <table role="presentation" cellPadding={0} cellSpacing={0} style={{ margin: "0 auto" }}>
                                  <tbody>
                                    <tr>
                                      <td style={{ paddingRight: 8 }}>
                                        <a href={correiosUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", backgroundColor: ACCENT, color: WHITE, textDecoration: "none", fontFamily: "Arial, sans-serif", fontSize: 12, letterSpacing: 1, padding: "11px 22px", borderRadius: 4 }}>
                                          Rastrear nos Correios
                                        </a>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Timeline */}
                        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: 32 }}>
                          <tbody>
                            <tr>
                              <td style={{ backgroundColor: CREAM, borderRadius: 6, border: `1px solid ${LINE}`, padding: "20px 24px" }}>
                                <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
                                  <tbody>
                                    {[
                                      { label: "Pedido recebido", done: true },
                                      { label: "Pagamento aprovado", done: true },
                                      { label: "Em preparação", done: true },
                                      { label: "Enviado — em trânsito", done: true },
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
                                                    backgroundColor: GREEN,
                                                    textAlign: "center",
                                                    lineHeight: "18px",
                                                    fontSize: 11,
                                                    color: WHITE,
                                                    fontFamily: "Arial, sans-serif",
                                                  }}>
                                                    ✓
                                                  </span>
                                                </td>
                                                <td style={{ paddingLeft: 10, fontFamily: "Arial, sans-serif", fontSize: 13, color: BRAND, fontWeight: 600 }}>
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

                        {/* CTA */}
                        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: 32 }}>
                          <tbody>
                            <tr>
                              <td align="center">
                                <a href={trackUrl} style={{ display: "inline-block", backgroundColor: BRAND, color: CREAM, textDecoration: "none", fontFamily: "Arial, sans-serif", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", padding: "15px 40px", borderRadius: 4 }}>
                                  Acompanhar no Site
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
