import { createAnonClient } from "@/lib/supabase/anon";
import { SITE_URL } from "@/lib/site";
import {
  CATALOG_BRAND,
  buildCatalogItems,
  formatCatalogPrice,
  type CatalogItem,
  type CatalogSourceProduct,
} from "@/lib/meta-catalog";

// GET /feed.xml — feed RSS 2.0 do catálogo da Meta (namespace g: do Google
// Merchant). Cadastrado no Commerce Manager como fonte de dados agendada; é o
// que permite marcar os produtos em posts e Reels do Instagram.
//
// Um item por produto + cor (ver lib/meta-catalog.ts). Só produtos e
// variantes ativos: o cliente anônimo (chave pública, somente leitura) já
// é limitado pelas políticas RLS a active = true.

export const revalidate = 3600;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    // Caracteres de controle são inválidos em XML 1.0
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

function tag(name: string, value: string | null | undefined): string {
  return value ? `      <g:${name}>${escapeXml(value)}</g:${name}>\n` : "";
}

function itemXml(item: CatalogItem): string {
  return (
    "    <item>\n" +
    tag("id", item.id) +
    tag("item_group_id", item.groupId) +
    tag("title", item.title) +
    tag("description", item.description) +
    tag("link", item.link) +
    tag("image_link", item.imageLink) +
    item.additionalImageLinks.map((url) => tag("additional_image_link", url)).join("") +
    tag("price", formatCatalogPrice(item.price)) +
    tag("sale_price", item.salePrice != null ? formatCatalogPrice(item.salePrice) : null) +
    tag("availability", item.inStock ? "in stock" : "out of stock") +
    tag("condition", "new") +
    tag("brand", CATALOG_BRAND) +
    tag("google_product_category", item.googleCategory) +
    tag("color", item.color) +
    tag("size", item.size) +
    tag("gender", "female") +
    tag("age_group", "adult") +
    "    </item>\n"
  );
}

export async function GET() {
  const supabase = createAnonClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      `name, description, price, original_price, images, sku_base,
       categories(slug),
       product_variants(color, size, stock_qty, active, images)`
    )
    .eq("active", true)
    .not("sku_base", "is", null)
    .order("sku_base");

  // Erro de consulta: nunca publicar um feed vazio (a Meta despublicaria o
  // catálogo inteiro). Em runtime, lança: o ISR continua servindo a versão
  // anterior. No build, responde 503 — o Next não grava respostas de erro e
  // gera o feed na primeira requisição, sem derrubar o deploy por uma
  // instabilidade do Supabase.
  if (error) {
    console.error("[feed.xml] erro na consulta", error);
    if (process.env.NEXT_PHASE === "phase-production-build") {
      return new Response("Feed indisponível", { status: 503 });
    }
    throw new Error(`Falha ao gerar feed: ${error.message}`);
  }

  const products = (data ?? []) as unknown as CatalogSourceProduct[];
  const items = products.filter((p) => p.sku_base?.trim()).flatMap(buildCatalogItems);

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n' +
    "  <channel>\n" +
    `    <title>${escapeXml(CATALOG_BRAND)}</title>\n` +
    `    <link>${escapeXml(SITE_URL)}</link>\n` +
    "    <description>Catálogo de produtos Kary Curadoria</description>\n" +
    items.map(itemXml).join("") +
    "  </channel>\n" +
    "</rss>\n";

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
