// Mensagem pré-preenchida para a cliente enviar à consultora pelo WhatsApp.
// Montada só no servidor: nomes, referências e links das peças vêm do banco,
// nunca do texto do modelo.
import { buildWhatsAppUrl, SITE_URL } from "@/lib/site";

export interface ConsultoraPiece {
  name: string;
  sku_base: string | null;
  slug: string;
}

export interface ConsultoraSummary {
  procura?: string;
  tamanho?: string;
  cor?: string;
  ocasiao?: string;
  pieces?: ConsultoraPiece[];
}

// ~600 caracteres: mensagem legível e link wa.me seguro em qualquer celular
const MAX_CHARS = 600;
const MAX_PIECES = 3;
const MAX_FIELD = 120;

function clean(v: string | undefined, max = MAX_FIELD): string {
  const s = (v ?? "").replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

// "Conjunto Feminino Alfaiataria: Blazer Alongado com Botão Único ... | Kary Curadoria (Ref: CON-0063)"
// → "Conjunto Blazer Alongado com Botão Único Dourado…"
export function shortProductName(name: string, max = 50): string {
  let base = name
    .split("|")[0]
    .replace(/\(\s*ref[^)]*\)/gi, "")
    .replace(/\b(feminino|feminina)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  // "Tipo Qualificadores: Descrição" → "Tipo Descrição"
  const colon = base.indexOf(":");
  if (colon > 0) base = `${base.slice(0, colon).split(" ")[0]} ${base.slice(colon + 1).trim()}`;
  if (base.length <= max) return base;
  const cut = base.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 20 ? cut.slice(0, lastSpace) : cut).replace(/[\s:,;-]+$/, "")}…`;
}

// Link curto /p/<ref> (redireciona para a página da peça); os slugs têm
// ~150 caracteres e estourariam o limite da mensagem.
export function productShortUrl(p: ConsultoraPiece): string {
  return p.sku_base
    ? `${SITE_URL}/p/${encodeURIComponent(p.sku_base)}`
    : `${SITE_URL}/produtos/${p.slug}`;
}

export function buildConsultoraMessage(summary: ConsultoraSummary): {
  text: string;
  included: ConsultoraPiece[];
} {
  const lines = ["Olá! Vim pelo assistente do site."];
  const fields: [string, string][] = [
    ["Estou procurando", clean(summary.procura)],
    ["Tamanho", clean(summary.tamanho, 40)],
    ["Cor", clean(summary.cor, 40)],
    ["Ocasião", clean(summary.ocasiao, 80)],
  ];
  for (const [label, value] of fields) if (value) lines.push(`${label}: ${value}`);

  let text = lines.join("\n");
  const pieces = (summary.pieces ?? []).slice(0, MAX_PIECES);
  const pieceLines: string[] = [];
  const included: ConsultoraPiece[] = [];
  for (const p of pieces) {
    const ref = p.sku_base ? ` (Ref: ${p.sku_base})` : "";
    const block = `- ${shortProductName(p.name)}${ref}\n  ${productShortUrl(p)}`;
    const candidate = [text, "Peças que vi:", ...pieceLines, block].join("\n");
    if (candidate.length > MAX_CHARS) break;
    pieceLines.push(block);
    included.push(p);
  }
  if (pieceLines.length > 0) text = [text, "Peças que vi:", ...pieceLines].join("\n");

  return { text: text.length > MAX_CHARS ? `${text.slice(0, MAX_CHARS - 1)}…` : text, included };
}

export function buildConsultoraUrl(summary: ConsultoraSummary): { url: string; included: ConsultoraPiece[] } {
  const { text, included } = buildConsultoraMessage(summary);
  return { url: buildWhatsAppUrl(text), included };
}
