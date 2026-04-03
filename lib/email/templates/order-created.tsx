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

const BRAND = "#2C1A0E";
const ACCENT = "#A0622A";
const CREAM = "#F5F0E8";
const MUTED = "#8B6B4A";
const WHITE = "#FFFFFF";
const LINE = "#E8DDD0";

const PAYMENT_LABELS: Record<string, string> = {
  pix: "Pix",
  boleto: "Boleto Bancário",
  credit_card: "Cartão de Crédito",
};

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

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
  const trackUrl = `${siteUrl}/rastrear?pedido=${orderNumber}`;
  const firstName = customerName.split(" ")[0];
  const payLabel = PAYMENT_LABELS[paymentMethod] ?? paymentMethod;

  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Pedido #{orderNumber} confirmado — Kary Curadoria</title>
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: CREAM, fontFamily: "Georgia, 'Times New Roman', serif", WebkitTextSizeAdjust: "100%" }}>

        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ backgroundColor: CREAM }}>
          <tbody>
            <tr>
              <td align="center" style={{ padding: "40px 16px 48px" }}>

                {/* ── Envelope ── */}
                <table role="presentation" cellPadding={0} cellSpacing={0} style={{ width: "100%", maxWidth: 580 }}>
                  <tbody>

                    {/* HEADER */}
                    <tr>
                      <td style={{ backgroundColor: BRAND, borderRadius: "10px 10px 0 0", padding: "36px 40px 32px" }}>
                        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
                          <tbody>
                            <tr>
                              <td align="center">
                                {/* Logotipo em texto */}
                                <p style={{ margin: 0, fontFamily: "Georgia, serif", fontSize: 26, fontWeight: 400, letterSpacing: 8, color: CREAM, textTransform: "uppercase" }}>
                                  Kary
                                </p>
                                <p style={{ margin: "2px 0 0", fontFamily: "Arial, sans-serif", fontSize: 9, fontWeight: 400, letterSpacing: 6, color: ACCENT, textTransform: "uppercase" }}>
                                  CURADORIA
                                </p>
                                {/* Linha decorativa */}
                                <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ marginTop: 20 }}>
                                  <tbody>
                                    <tr>
                                      <td style={{ height: 1, backgroundColor: ACCENT, opacity: 0.5 }} />
                                    </tr>
                                  </tbody>
                                </table>
                                <p style={{ margin: "20px 0 0", fontFamily: "Arial, sans-serif", fontSize: 11, letterSpacing: 3, color: CREAM, textTransform: "uppercase", opacity: 0.75 }}>
                                  Confirmação de Pedido
                                </p>
                                <p style={{ margin: "12px 0 0", fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 400, color: WHITE, lineHeight: 1.2 }}>
                                  Obrigada pela compra!
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

                        {/* Saudação */}
                        <p style={{ margin: "0 0 8px", fontFamily: "Georgia, serif", fontSize: 18, color: BRAND }}>
                          Olá, {firstName}!
                        </p>
                        <p style={{ margin: "0 0 28px", fontFamily: "Arial, sans-serif", fontSize: 14, lineHeight: 1.7, color: MUTED }}>
                          Recebemos seu pedido com sucesso. Assim que o pagamento for confirmado, começaremos a preparar sua encomenda com todo o cuidado que ela merece.
                        </p>

                        {/* Box número do pedido */}
                        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: 32 }}>
                          <tbody>
                            <tr>
                              <td style={{ backgroundColor: CREAM, borderRadius: 6, border: `1px solid ${LINE}`, padding: "18px 24px" }}>
                                <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
                                  <tbody>
                                    <tr>
                                      <td>
                                        <p style={{ margin: 0, fontFamily: "Arial, sans-serif", fontSize: 10, letterSpacing: 2, color: MUTED, textTransform: "uppercase" }}>
                                          Número do Pedido
                                        </p>
                                        <p style={{ margin: "4px 0 0", fontFamily: "Georgia, serif", fontSize: 22, color: BRAND, fontWeight: 400 }}>
                                          #{orderNumber}
                                        </p>
                                      </td>
                                      <td align="right">
                                        <p style={{ margin: 0, fontFamily: "Arial, sans-serif", fontSize: 10, letterSpacing: 2, color: MUTED, textTransform: "uppercase" }}>
                                          Pagamento
                                        </p>
                                        <p style={{ margin: "4px 0 0", fontFamily: "Arial, sans-serif", fontSize: 14, color: BRAND, fontWeight: 600 }}>
                                          {payLabel}
                                        </p>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Tabela de produtos */}
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
                                  {item.variant ? (
                                    <span style={{ display: "block", fontSize: 12, color: MUTED, marginTop: 2 }}>
                                      {item.variant}
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
                        </table>

                        {/* Resumo de valores */}
                        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: 32 }}>
                          <tbody>
                            <tr>
                              <td align="right">
                                <table role="presentation" cellPadding={0} cellSpacing={0} style={{ marginLeft: "auto" }}>
                                  <tbody>
                                    <tr>
                                      <td style={{ padding: "5px 14px 5px 80px", fontFamily: "Arial, sans-serif", fontSize: 13, color: MUTED }}>
                                        Subtotal
                                      </td>
                                      <td style={{ padding: "5px 0 5px 24px", fontFamily: "Arial, sans-serif", fontSize: 13, color: BRAND, textAlign: "right", whiteSpace: "nowrap" }}>
                                        {fmt(subtotal)}
                                      </td>
                                    </tr>
                                    <tr>
                                      <td style={{ padding: "5px 14px 5px 80px", fontFamily: "Arial, sans-serif", fontSize: 13, color: MUTED }}>
                                        Frete
                                      </td>
                                      <td style={{ padding: "5px 0 5px 24px", fontFamily: "Arial, sans-serif", fontSize: 13, color: BRAND, textAlign: "right", whiteSpace: "nowrap" }}>
                                        {shippingCost > 0 ? fmt(shippingCost) : "Grátis"}
                                      </td>
                                    </tr>
                                    {discount > 0 ? (
                                      <tr>
                                        <td style={{ padding: "5px 14px 5px 80px", fontFamily: "Arial, sans-serif", fontSize: 13, color: MUTED }}>
                                          Desconto
                                        </td>
                                        <td style={{ padding: "5px 0 5px 24px", fontFamily: "Arial, sans-serif", fontSize: 13, color: ACCENT, textAlign: "right", whiteSpace: "nowrap" }}>
                                          – {fmt(discount)}
                                        </td>
                                      </tr>
                                    ) : null}
                                    <tr>
                                      <td colSpan={2} style={{ paddingTop: 8 }}>
                                        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
                                          <tbody>
                                            <tr>
                                              <td style={{ height: 1, backgroundColor: LINE }} />
                                            </tr>
                                          </tbody>
                                        </table>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td style={{ padding: "10px 14px 0 80px", fontFamily: "Georgia, serif", fontSize: 16, color: BRAND, fontWeight: 400 }}>
                                        Total
                                      </td>
                                      <td style={{ padding: "10px 0 0 24px", fontFamily: "Georgia, serif", fontSize: 18, color: BRAND, fontWeight: 400, textAlign: "right", whiteSpace: "nowrap" }}>
                                        {fmt(total)}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Instruções de pagamento */}
                        {paymentMethod === "pix" && pixCode ? (
                          <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: 32 }}>
                            <tbody>
                              <tr>
                                <td style={{ backgroundColor: CREAM, borderRadius: 6, border: `1px solid ${LINE}`, borderLeft: `4px solid ${ACCENT}`, padding: "20px 24px" }}>
                                  <p style={{ margin: "0 0 6px", fontFamily: "Arial, sans-serif", fontSize: 11, letterSpacing: 2, color: ACCENT, textTransform: "uppercase", fontWeight: 600 }}>
                                    Pague via Pix
                                  </p>
                                  <p style={{ margin: "0 0 12px", fontFamily: "Arial, sans-serif", fontSize: 13, color: MUTED, lineHeight: 1.6 }}>
                                    Copie o código abaixo e cole no app do seu banco em <strong>Pix Copia e Cola</strong>. O pedido é confirmado em segundos.
                                  </p>
                                  <div style={{ backgroundColor: WHITE, borderRadius: 4, padding: "12px 14px", fontFamily: "'Courier New', monospace", fontSize: 11, color: BRAND, wordBreak: "break-all", lineHeight: 1.5, border: `1px solid ${LINE}` }}>
                                    {pixCode}
                                  </div>
                                  <p style={{ margin: "8px 0 0", fontFamily: "Arial, sans-serif", fontSize: 11, color: MUTED }}>
                                    O código expira em 30 minutos.
                                  </p>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        ) : null}

                        {paymentMethod === "boleto" && boletoUrl ? (
                          <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: 32 }}>
                            <tbody>
                              <tr>
                                <td style={{ backgroundColor: CREAM, borderRadius: 6, border: `1px solid ${LINE}`, borderLeft: `4px solid ${ACCENT}`, padding: "20px 24px" }}>
                                  <p style={{ margin: "0 0 6px", fontFamily: "Arial, sans-serif", fontSize: 11, letterSpacing: 2, color: ACCENT, textTransform: "uppercase", fontWeight: 600 }}>
                                    Boleto Bancário
                                  </p>
                                  <p style={{ margin: "0 0 12px", fontFamily: "Arial, sans-serif", fontSize: 13, color: MUTED, lineHeight: 1.6 }}>
                                    Pague o boleto em qualquer banco, lotérica ou pelo app do seu banco. Vence em 3 dias úteis.
                                  </p>
                                  {boletoBarcode ? (
                                    <p style={{ margin: "0 0 14px", fontFamily: "'Courier New', monospace", fontSize: 11, color: BRAND, wordBreak: "break-all", backgroundColor: WHITE, padding: "10px 12px", borderRadius: 4, border: `1px solid ${LINE}` }}>
                                      {boletoBarcode}
                                    </p>
                                  ) : null}
                                  <a href={boletoUrl} style={{ display: "inline-block", backgroundColor: ACCENT, color: WHITE, textDecoration: "none", fontFamily: "Arial, sans-serif", fontSize: 13, fontWeight: 600, letterSpacing: 1, padding: "11px 24px", borderRadius: 4 }}>
                                    Visualizar Boleto
                                  </a>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        ) : null}

                        {paymentMethod === "credit_card" ? (
                          <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: 32 }}>
                            <tbody>
                              <tr>
                                <td style={{ backgroundColor: CREAM, borderRadius: 6, border: `1px solid ${LINE}`, borderLeft: `4px solid ${ACCENT}`, padding: "20px 24px" }}>
                                  <p style={{ margin: "0 0 6px", fontFamily: "Arial, sans-serif", fontSize: 11, letterSpacing: 2, color: ACCENT, textTransform: "uppercase", fontWeight: 600 }}>
                                    Cartão de Crédito
                                  </p>
                                  <p style={{ margin: 0, fontFamily: "Arial, sans-serif", fontSize: 13, color: MUTED, lineHeight: 1.6 }}>
                                    Seu pagamento está sendo processado. Você receberá uma confirmação por e-mail assim que for aprovado.
                                  </p>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        ) : null}

                        {/* CTA */}
                        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: 32 }}>
                          <tbody>
                            <tr>
                              <td align="center">
                                <a href={trackUrl} style={{ display: "inline-block", backgroundColor: BRAND, color: CREAM, textDecoration: "none", fontFamily: "Arial, sans-serif", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", padding: "15px 40px", borderRadius: 4 }}>
                                  Acompanhar Pedido
                                </a>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Divider */}
                        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: 24 }}>
                          <tbody>
                            <tr>
                              <td style={{ height: 1, backgroundColor: LINE }} />
                            </tr>
                          </tbody>
                        </table>

                        {/* Rodapé do corpo */}
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
