import * as React from "react";

interface OrderShippedProps {
  orderNumber: string;
  customerName: string;
  trackingCode: string;
  carrier?: string;
}

export function OrderShippedEmail({ orderNumber, customerName, trackingCode, carrier }: OrderShippedProps) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://karycuradoria.com.br";
  const correiosUrl = `https://rastreamento.correios.com.br/app/index.php`;

  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Pedido #{orderNumber} enviado!</title>
      </head>
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
                          Seu pedido foi enviado! 🎉
                        </h1>
                      </td>
                    </tr>

                    {/* Body */}
                    <tr>
                      <td style={{ backgroundColor: "#FFFFFF", padding: "40px", borderRadius: "0 0 8px 8px" }}>
                        <p style={{ margin: "0 0 16px", color: "#5C3317", fontSize: 16 }}>
                          Olá, <strong>{customerName}</strong>!
                        </p>
                        <p style={{ margin: "0 0 32px", color: "#5C3317", fontSize: 15, lineHeight: 1.6 }}>
                          Seu pedido <strong>#{orderNumber}</strong> foi despachado e está a caminho. Use o código abaixo para rastrear sua encomenda.
                        </p>

                        {/* Tracking box */}
                        <div style={{ backgroundColor: "#EDE8DC", borderRadius: 8, padding: "24px", textAlign: "center", marginBottom: 32 }}>
                          <p style={{ margin: "0 0 8px", color: "#B89070", fontSize: 12, letterSpacing: 2, textTransform: "uppercase" }}>
                            Código de Rastreamento
                          </p>
                          <p style={{ margin: "0 0 4px", color: "#5C3317", fontSize: 22, fontWeight: 700, fontFamily: "monospace", letterSpacing: 2 }}>
                            {trackingCode}
                          </p>
                          {carrier && (
                            <p style={{ margin: "0 0 16px", color: "#B89070", fontSize: 13 }}>{carrier}</p>
                          )}
                          <a
                            href={correiosUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: "inline-block", backgroundColor: "#A0622A", color: "#FFFFFF", textDecoration: "none", borderRadius: 4, padding: "10px 24px", fontSize: 14 }}
                          >
                            Rastrear nos Correios
                          </a>
                        </div>

                        {/* Track on site */}
                        <div style={{ textAlign: "center", marginBottom: 32 }}>
                          <a
                            href={`${siteUrl}/rastrear?pedido=${orderNumber}`}
                            style={{ display: "inline-block", backgroundColor: "#5C3317", color: "#EDE8DC", textDecoration: "none", borderRadius: 4, padding: "12px 32px", fontSize: 15 }}
                          >
                            Acompanhar no Site
                          </a>
                        </div>

                        <p style={{ margin: 0, color: "#B89070", fontSize: 13, textAlign: "center" }}>
                          Dúvidas? WhatsApp{" "}
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
