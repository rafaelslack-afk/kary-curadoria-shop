// Tipos e utilitários puros do catálogo de atacado (seguros para o navegador).

export interface AtacadoVariant {
  id: string;
  color: string;
  size: string;
  sku: string | null;
  images: string[];
}

export interface AtacadoProduct {
  id: string;
  slug: string;
  name: string;
  reference: string | null;
  description: string | null;
  price: number; // preço atual de varejo (promocional, se houver) — base da regra
  images: string[];
  category: { slug: string; name: string } | null;
  variants: AtacadoVariant[];
  createdAt: string;
}

// Ordem de exibição dos tamanhos
const SIZE_ORDER = ["PP", "P", "M", "G", "GG", "G1", "G2", "G3", "U", "UNICO", "ÚNICO"];

export function sortSizes(sizes: string[]): string[] {
  const rank = (s: string) => {
    const i = SIZE_ORDER.indexOf(s.trim().toUpperCase());
    return i === -1 ? 100 : i;
  };
  return Array.from(new Set(sizes)).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, "pt-BR"));
}
