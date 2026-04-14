import * as React from "react";

interface LowStockItem {
  productName: string;
  variantLabel: string;
  sku: string;
  stock: number;
}

interface LowStockAlertProps {
  items: LowStockItem[];
}

export function LowStockAlertEmail({ items }: LowStockAlertProps) {
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
                      <td style={{ backgroundColor: "#5C3317", padding: "28px 40px", textAlign: "center", borderRadius: "8px 8px 0 0" }}>
                        <p style={{ margin: 0, color: "#EDE8DC", fontSize: 12, letterSpacing: 4, textTransform: "uppercase" }}>
                          Kary Curadoria — Admin
                        </p>
                        <h1 style={{ margin: "8px 0 0", color: "#EDE8DC", fontSize: 22, fontWeight: 400 }}>
                          ⚠ Alerta de Estoque Baixo
                        </h1>
                      </td>
                    </tr>

                    {/* Body */}
                    <tr>
                      <td style={{ backgroundColor: "#FFFFFF", padding: "32px 40px", borderRadius: "0 0 8px 8px" }}>
                        <p style={{ margin: "0 0 24px", color: "#5C3317", fontSize: 15, lineHeight: 1.6 }}>
                          Os seguintes produtos estão com estoque igual ou inferior a 3 unidades. Faça a reposição para evitar falta de produtos.
                        </p>

                        <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ backgroundColor: "#EDE8DC" }}>
                              <th style={{ padding: "10px 12px", textAlign: "left", color: "#5C3317", fontSize: 13, fontWeight: 600 }}>Produto</th>
                              <th style={{ padding: "10px 12px", textAlign: "left", color: "#5C3317", fontSize: 13, fontWeight: 600 }}>Variação</th>
                              <th style={{ padding: "10px 12px", textAlign: "left", color: "#5C3317", fontSize: 13, fontWeight: 600 }}>SKU</th>
                              <th style={{ padding: "10px 12px", textAlign: "center", color: "#5C3317", fontSize: 13, fontWeight: 600 }}>Estoque</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item, i) => (
                              <tr key={i} style={{ borderBottom: "1px solid #EDE8DC", backgroundColor: item.stock === 0 ? "#fff8f5" : "transparent" }}>
                                <td style={{ padding: "12px", color: "#5C3317", fontSize: 14 }}>{item.productName}</td>
                                <td style={{ padding: "12px", color: "#5C3317", fontSize: 14 }}>{item.variantLabel}</td>
                                <td style={{ padding: "12px", color: "#B89070", fontSize: 13, fontFamily: "monospace" }}>{item.sku}</td>
                                <td style={{ padding: "12px", textAlign: "center" }}>
                                  <span
                                    style={{
                                      display: "inline-block",
                                      backgroundColor: item.stock === 0 ? "#fee2e2" : "#fef3c7",
                                      color: item.stock === 0 ? "#991b1b" : "#92400e",
                                      borderRadius: 4,
                                      padding: "2px 10px",
                                      fontSize: 13,
                                      fontWeight: 700,
                                    }}
                                  >
                                    {item.stock}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        <div style={{ textAlign: "center", marginTop: 32 }}>
                          <a
                            href={`${siteUrl}/admin/produtos`}
                            style={{ display: "inline-block", backgroundColor: "#5C3317", color: "#EDE8DC", textDecoration: "none", borderRadius: 4, padding: "12px 32px", fontSize: 15 }}
                          >
                            Gerenciar Produtos
                          </a>
                        </div>
                      </td>
                    </tr>

                    {/* Footer */}
                    <tr>
                      <td style={{ textAlign: "center", paddingTop: 24 }}>
                        <p style={{ margin: 0, color: "#B89070", fontSize: 12 }}>
                          © {new Date().getFullYear()} Kary Curadoria — Alerta automático do sistema
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
