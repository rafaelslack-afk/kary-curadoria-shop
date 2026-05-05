import * as React from "react";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface LowStockItem {
  sku: string;
  size: string;
  color: string | null;
  stock_qty: number;
  stock_min: number;
  productName: string;
  skuBase: string;
}

interface LowStockAlertProps {
  orderNumber: string;
  items: LowStockItem[];
}

// ── Cores do template ─────────────────────────────────────────────────────────

const BRAND   = "#5C3317";
const ACCENT  = "#A0622A";
const MUTED   = "#B89070";
const LINE    = "#EDE8DC";
const BG      = "#f5f1ea";
const WHITE   = "#FFFFFF";
const RED_BG  = "#fee2e2";
const RED_FG  = "#991b1b";
const YEL_BG  = "#fef3c7";
const YEL_FG  = "#92400e";

// ── Tipos internos para agrupamento ──────────────────────────────────────────

interface SizeEntry {
  size: string;
  stock_qty: number;
  stock_min: number;
}

interface ProductGroup {
  name: string;
  skuBase: string;
  colors: Record<string, SizeEntry[]>; // colorName → sizes
}

// ── Componente ────────────────────────────────────────────────────────────────

export function LowStockAlertEmail({ orderNumber, items }: LowStockAlertProps) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://karycuradoria.com.br";

  // Agrupa: produto → cor → tamanhos
  const grouped: Record<string, ProductGroup> = {};
  for (const v of items) {
    const key = `${v.productName}||${v.skuBase}`;
    if (!grouped[key]) {
      grouped[key] = { name: v.productName, skuBase: v.skuBase, colors: {} };
    }
    const colorKey = v.color ?? "Sem cor";
    if (!grouped[key].colors[colorKey]) {
      grouped[key].colors[colorKey] = [];
    }
    grouped[key].colors[colorKey].push({
      size: v.size,
      stock_qty: v.stock_qty,
      stock_min: v.stock_min,
    });
  }
  const products = Object.values(grouped);

  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, padding: 0, backgroundColor: BG, fontFamily: "Arial, sans-serif" }}>
        <table width="100%" cellPadding={0} cellSpacing={0} style={{ backgroundColor: BG }}>
          <tbody>
            <tr>
              <td align="center" style={{ padding: "40px 16px" }}>
                <table width="600" cellPadding={0} cellSpacing={0} style={{ maxWidth: 600, width: "100%" }}>
                  <tbody>

                    {/* ── Cabeçalho ── */}
                    <tr>
                      <td style={{ backgroundColor: BRAND, padding: "28px 40px", textAlign: "center", borderRadius: "8px 8px 0 0" }}>
                        <p style={{ margin: 0, color: LINE, fontSize: 11, letterSpacing: 4, textTransform: "uppercase" }}>
                          Kary Curadoria — Admin
                        </p>
                        <h1 style={{ margin: "8px 0 4px", color: LINE, fontSize: 22, fontWeight: 400 }}>
                          ⚠ Alerta de Estoque Baixo
                        </h1>
                        <p style={{ margin: 0, color: MUTED, fontSize: 13 }}>
                          Pedido #{orderNumber}
                        </p>
                      </td>
                    </tr>

                    {/* ── Corpo ── */}
                    <tr>
                      <td style={{ backgroundColor: WHITE, padding: "32px 40px", borderRadius: "0 0 8px 8px" }}>

                        <p style={{ margin: "0 0 28px", color: BRAND, fontSize: 15, lineHeight: 1.6 }}>
                          Os seguintes itens do <strong>Pedido #{orderNumber}</strong> foram vendidos e estão abaixo do estoque mínimo:
                        </p>

                        {/* ── Um bloco por produto ── */}
                        {products.map((product, pi) => (
                          <table
                            key={pi}
                            width="100%"
                            cellPadding={0}
                            cellSpacing={0}
                            style={{ borderCollapse: "collapse", marginBottom: 24, border: `1px solid ${LINE}`, borderRadius: 6 }}
                          >
                            <tbody>
                              {/* Nome do produto */}
                              <tr>
                                <td
                                  colSpan={3}
                                  style={{ backgroundColor: LINE, padding: "10px 16px", borderRadius: "6px 6px 0 0" }}
                                >
                                  <span style={{ color: BRAND, fontSize: 14, fontWeight: 700 }}>
                                    {product.name}
                                  </span>
                                  <span style={{ color: MUTED, fontSize: 12, marginLeft: 8, fontFamily: "monospace" }}>
                                    {product.skuBase}
                                  </span>
                                </td>
                              </tr>

                              {/* Cabeçalho de colunas */}
                              <tr style={{ backgroundColor: "#faf9f7" }}>
                                <th style={{ padding: "8px 16px", textAlign: "left", color: ACCENT, fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", width: "40%" }}>
                                  Cor / Tamanho
                                </th>
                                <th style={{ padding: "8px 16px", textAlign: "center", color: ACCENT, fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", width: "30%" }}>
                                  Estoque atual
                                </th>
                                <th style={{ padding: "8px 16px", textAlign: "center", color: ACCENT, fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", width: "30%" }}>
                                  Mínimo
                                </th>
                              </tr>

                              {/* Linhas: cor → tamanhos */}
                              {Object.entries(product.colors).map(([colorName, sizes]) =>
                                sizes.map((s, si) => {
                                  const zerado = s.stock_qty === 0;
                                  const icon = zerado ? "🔴" : "🟡";
                                  const stockBg = zerado ? RED_BG : YEL_BG;
                                  const stockFg = zerado ? RED_FG : YEL_FG;
                                  return (
                                    <tr
                                      key={`${colorName}-${si}`}
                                      style={{ borderTop: `1px solid ${LINE}`, backgroundColor: zerado ? "#fffaf9" : WHITE }}
                                    >
                                      <td style={{ padding: "10px 16px", color: BRAND, fontSize: 13 }}>
                                        {si === 0 && (
                                          <span style={{ color: MUTED, fontSize: 11, display: "block", marginBottom: 2 }}>
                                            {colorName}
                                          </span>
                                        )}
                                        {icon} Tam. <strong>{s.size}</strong>
                                      </td>
                                      <td style={{ padding: "10px 16px", textAlign: "center" }}>
                                        <span
                                          style={{
                                            display: "inline-block",
                                            backgroundColor: stockBg,
                                            color: stockFg,
                                            borderRadius: 4,
                                            padding: "2px 12px",
                                            fontSize: 14,
                                            fontWeight: 700,
                                          }}
                                        >
                                          {s.stock_qty} un.
                                        </span>
                                      </td>
                                      <td style={{ padding: "10px 16px", textAlign: "center", color: MUTED, fontSize: 13 }}>
                                        {s.stock_min} un.
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        ))}

                        {/* ── CTA ── */}
                        <div style={{ textAlign: "center", marginTop: 8 }}>
                          <a
                            href={`${siteUrl}/admin/estoque`}
                            style={{
                              display: "inline-block",
                              backgroundColor: BRAND,
                              color: LINE,
                              textDecoration: "none",
                              borderRadius: 4,
                              padding: "12px 32px",
                              fontSize: 15,
                            }}
                          >
                            Reabastecer estoque
                          </a>
                        </div>
                      </td>
                    </tr>

                    {/* ── Rodapé ── */}
                    <tr>
                      <td style={{ textAlign: "center", paddingTop: 24 }}>
                        <p style={{ margin: 0, color: MUTED, fontSize: 12 }}>
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
