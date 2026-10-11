import { shortProductUrl } from "@/lib/product-og";

// Catálogo da Meta (Commerce Manager → marcação de produtos no Instagram).
//
// Fonte única dos IDs do catálogo: o feed (/feed.xml), as meta tags do link
// curto (/p/[ref]) e os eventos do Pixel precisam usar EXATAMENTE os mesmos
// valores, senão a Meta não casa evento ↔ item do catálogo.
//
// - Item do catálogo = produto + cor   → g:id = CODIGO-COR (ex.: B01-VERDE-MUSGO)
// - Grupo (todas as cores do produto)  → g:item_group_id = CODIGO (sku_base)
// - Produto sem variante               → g:id = CODIGO
//
// O tamanho NÃO entra no ID: na Meta cada cor vira um item e a disponibilidade
// do item é "em estoque" se qualquer tamanho daquela cor tiver estoque.
//
// NÃO importar nada de @/lib/supabase aqui — este arquivo também é usado por
// componentes "use client" (Pixel na página de produto).

export const CATALOG_BRAND = "Kary Curadoria";
export const CATALOG_CURRENCY = "BRL";

// Código do produto (sku_base) normalizado, igual ao do link curto /p/[ref].
export function catalogCode(skuBase: string): string {
  return skuBase.trim().toUpperCase();
}

// "Verde Musgo" → "VERDE-MUSGO", "Café" → "CAFE", "Off-White" → "OFF-WHITE"
export function catalogColorCode(color: string): string {
  return color
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// g:id do item. Sem cor (ou cor vazia), o item é o próprio produto.
export function catalogItemId(skuBase: string, color?: string | null): string {
  const code = catalogCode(skuBase);
  const colorCode = color ? catalogColorCode(color) : "";
  return colorCode ? `${code}-${colorCode}` : code;
}

// URL canônica usada como g:link. O Instagram casa a URL colada na marcação
// com este campo, então o formato é fixo: https://karycuradoria.com.br/p/CODIGO
export const catalogProductUrl = shortProductUrl;

// Categoria da loja → taxonomia do Google (aceita pelo catálogo da Meta).
const GOOGLE_CATEGORY_BY_SLUG: Record<string, string> = {
  conjuntos: "Apparel & Accessories > Clothing > Outfit Sets",
  blazer: "Apparel & Accessories > Clothing > Outerwear > Coats & Jackets",
  casacos: "Apparel & Accessories > Clothing > Outerwear > Coats & Jackets",
  jaquetas: "Apparel & Accessories > Clothing > Outerwear > Coats & Jackets",
  calcas: "Apparel & Accessories > Clothing > Pants",
  camisas: "Apparel & Accessories > Clothing > Shirts & Tops",
  blusinhas: "Apparel & Accessories > Clothing > Shirts & Tops",
  body: "Apparel & Accessories > Clothing > Shirts & Tops",
  vestidos: "Apparel & Accessories > Clothing > Dresses",
  saias: "Apparel & Accessories > Clothing > Skirts",
  shorts: "Apparel & Accessories > Clothing > Shorts",
};
const GOOGLE_CATEGORY_FALLBACK = "Apparel & Accessories > Clothing";

export function googleProductCategory(categorySlug?: string | null): string {
  return (categorySlug && GOOGLE_CATEGORY_BY_SLUG[categorySlug]) || GOOGLE_CATEGORY_FALLBACK;
}

// Texto puro: remove tags HTML, decodifica entidades comuns e junta espaços.
export function plainText(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/<\s*br\s*\/?>/gi, " ")
    .replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // espaços de largura zero
    .replace(/\s+/g, " ")
    .trim();
}

// "199.9" → "199.90 BRL"
export function formatCatalogPrice(value: number): string {
  return `${value.toFixed(2)} ${CATALOG_CURRENCY}`;
}

// ── Montagem dos itens ──────────────────────────────────────────────────────

export interface CatalogSourceVariant {
  color: string | null;
  size: string;
  stock_qty: number;
  active: boolean | null;
  images: string[] | null;
}

export interface CatalogSourceProduct {
  name: string;
  description: string | null;
  price: number | string;
  original_price: number | string | null;
  images: string[] | null;
  sku_base: string;
  // Relação muitos-para-um do PostgREST: chega como objeto, mas o tipo
  // inferido pelo supabase-js sem schema gerado é um array.
  categories?: { slug: string } | { slug: string }[] | null;
  product_variants: CatalogSourceVariant[] | null;
}

export interface CatalogItem {
  id: string;
  groupId: string;
  title: string;
  description: string;
  link: string;
  imageLink: string | null;
  additionalImageLinks: string[];
  // Preço cheio (g:price) e promocional (g:sale_price, só quando há desconto)
  price: number;
  salePrice: number | null;
  inStock: boolean;
  color: string | null;
  size: string | null;
  googleCategory: string;
}

const MAX_ADDITIONAL_IMAGES = 10;
const MAX_TITLE = 200;
const MAX_DESCRIPTION = 5000;

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s;
}

// Um item por cor ativa do produto (ou um item só, sem cor, se o produto não
// tiver variante ativa — nesse caso fica "out of stock", como na página).
export function buildCatalogItems(product: CatalogSourceProduct): CatalogItem[] {
  const groupId = catalogCode(product.sku_base);
  // O nome já é texto puro (não passa pelo removedor de HTML: "<" é legítimo)
  const title = truncate(product.name.replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\s+/g, " ").trim(), MAX_TITLE);
  const description = truncate(plainText(product.description) || title, MAX_DESCRIPTION);
  const link = catalogProductUrl(product.sku_base);
  const productImages = (product.images ?? []).filter(Boolean);
  const category = Array.isArray(product.categories) ? product.categories[0] : product.categories;
  const googleCategory = googleProductCategory(category?.slug);

  const current = Number(product.price);
  const original = product.original_price != null ? Number(product.original_price) : null;
  const onSale = original != null && original > current;
  const price = onSale ? original : current;
  const salePrice = onSale ? current : null;

  const variants = (product.product_variants ?? []).filter((v) => v.active !== false);

  const base = { groupId, title, description, link, price, salePrice, googleCategory };

  if (variants.length === 0) {
    return [
      {
        ...base,
        id: groupId,
        imageLink: productImages[0] ?? null,
        additionalImageLinks: productImages.slice(1, 1 + MAX_ADDITIONAL_IMAGES),
        inStock: false,
        color: null,
        size: null,
      },
    ];
  }

  // Agrupa por cor, na ordem alfabética (ordem estável no feed)
  const byColor = new Map<string, CatalogSourceVariant[]>();
  for (const v of variants) {
    const key = v.color?.trim() ?? "";
    const list = byColor.get(key) ?? [];
    list.push(v);
    byColor.set(key, list);
  }
  const colors = Array.from(byColor.keys()).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const items: CatalogItem[] = [];
  const seenIds = new Set<string>();
  for (const color of colors) {
    const group = byColor.get(color)!;
    const id = catalogItemId(product.sku_base, color || null);
    // Duas grafias da mesma cor ("Café"/"Cafe") geram o mesmo ID: fica a primeira.
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    const colorImages = group.find((v) => (v.images ?? []).length > 0)?.images ?? [];
    const images = Array.from(new Set([...colorImages, ...productImages].filter(Boolean)));
    const sizes = Array.from(new Set(group.map((v) => v.size)));

    items.push({
      ...base,
      id,
      imageLink: images[0] ?? null,
      additionalImageLinks: images.slice(1, 1 + MAX_ADDITIONAL_IMAGES),
      inStock: group.some((v) => v.stock_qty > 0),
      color: color || null,
      // Só um tamanho para a cor (ex.: "Único") → informa; vários → omite,
      // porque o item da Meta representa a cor, não um tamanho específico.
      size: sizes.length === 1 ? sizes[0] : null,
    });
  }
  return items;
}

// Item que representa a página do produto (meta tags e JSON-LD): a primeira
// cor com estoque, senão a primeira cor.
export function representativeItem(items: CatalogItem[]): CatalogItem | null {
  return items.find((i) => i.inStock) ?? items[0] ?? null;
}
