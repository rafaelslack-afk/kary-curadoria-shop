import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildProductOg, shortProductUrl } from "@/lib/product-og";
import { optimizedImageUrl } from "@/lib/storage-image";
import {
  CATALOG_BRAND,
  CATALOG_CURRENCY,
  buildCatalogItems,
  representativeItem,
} from "@/lib/meta-catalog";

export const runtime = "nodejs";
// Consulta o banco a cada requisição: sem lista do build, sem Data Cache.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

// GET /p/VES-0021 — link curto por referência (sku_base). É o link padrão de
// compartilhamento em DM do Instagram e WhatsApp (e o usado pelo assistente).
//
// - Navegador comum: redireciona para /produtos/<slug> com utm_source=link_curto
//   e utm_medium=dm, para o GA4 atribuir visitas e vendas ao link.
// - Crawler de preview (Meta/WhatsApp e afins): responde 200 com as mesmas
//   meta tags Open Graph da página do produto. Nem todo crawler segue
//   redirecionamento, e assim o card sai igual ao da página. O og:url é o
//   próprio link curto: tocar no card também passa pelo redirect com UTM.
//   Esta URL é também o g:link do feed do catálogo da Meta (/feed.xml): por
//   isso a resposta traz og:type=product, as tags product:* (preço,
//   disponibilidade, IDs do catálogo), canonical e JSON-LD Product, tudo no
//   HTML inicial (o crawler da Meta não executa JS).
// - Referência inexistente, produto inativo ou erro na consulta: vai para
//   /produtos (o erro fica no log). Esta rota nunca responde 404.
//
// O header X-Link-Curto diz qual caminho a resposta seguiu (produto, preview,
// nao-encontrado, invalido, erro), para diagnosticar com curl -sI.

const PREVIEW_BOTS =
  /facebookexternalhit|facebookcatalog|meta-externalagent|meta-externalfetcher|facebot|whatsapp|twitterbot|telegrambot|slackbot|linkedinbot|discordbot|skypeuripreview|pinterest/i;

function withUtm(url: URL): URL {
  url.searchParams.set("utm_source", "link_curto");
  url.searchParams.set("utm_medium", "dm");
  return url;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const NO_STORE = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "User-Agent",
};

type Outcome = "produto" | "preview" | "nao-encontrado" | "invalido" | "erro";

function redirect(url: URL, outcome: Outcome) {
  return NextResponse.redirect(url, {
    status: 302,
    headers: { ...NO_STORE, "X-Link-Curto": outcome },
  });
}

export async function GET(request: NextRequest, { params }: { params: { ref: string } }) {
  const fallback = withUtm(new URL("/produtos", request.url));
  try {
    return await handle(request, params?.ref ?? "", fallback);
  } catch (err) {
    console.error("[link-curto] erro inesperado", { ref: params?.ref, err });
    return redirect(fallback, "erro");
  }
}

export const HEAD = GET;

async function handle(request: NextRequest, rawRef: string, fallback: URL) {
  let ref = "";
  try {
    ref = decodeURIComponent(rawRef).trim().toUpperCase();
  } catch {
    // % malformado: trata como referência inválida
  }
  if (!/^[A-Z0-9-]{2,20}$/.test(ref)) return redirect(fallback, "invalido");

  const admin = createAdminClient();
  const { data: product, error } = await admin
    .from("products")
    .select(
      `name, slug, description, images, price, original_price, sku_base,
       categories(slug),
       product_variants(color, size, stock_qty, active, images)`
    )
    .ilike("sku_base", ref) // sem diferenciar maiúsculas/minúsculas
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[link-curto] erro na consulta", { ref, error });
    return redirect(fallback, "erro");
  }
  if (!product?.slug) return redirect(fallback, "nao-encontrado");

  const destination = withUtm(new URL(`/produtos/${product.slug}`, request.url));

  const ua = request.headers.get("user-agent") ?? "";
  if (!PREVIEW_BOTS.test(ua)) return redirect(destination, "produto");

  const og = buildProductOg(product);
  const canonical = shortProductUrl(ref);
  const items = buildCatalogItems({ ...product, sku_base: product.sku_base ?? ref });
  const item = representativeItem(items)!;
  const inStock = items.some((i) => i.inStock);
  // Preço pago hoje (promocional, se houver) — o mesmo da página do produto
  const currentPrice = item.salePrice ?? item.price;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: item.description,
    image: (product.images ?? []).length > 0 ? product.images!.map(optimizedImageUrl) : [og.image.url],
    sku: item.id,
    productGroupID: item.groupId,
    brand: { "@type": "Brand", name: CATALOG_BRAND },
    url: canonical,
    offers: {
      "@type": "Offer",
      url: canonical,
      priceCurrency: CATALOG_CURRENCY,
      price: currentPrice.toFixed(2),
      itemCondition: "https://schema.org/NewCondition",
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: CATALOG_BRAND },
    },
  };
  // "<" escapado: o JSON não pode fechar a tag <script> antes da hora
  const jsonLdHtml = JSON.stringify(jsonLd).replace(/</g, "\\u003c");

  const e = escapeHtml;
  const href = e(destination.toString());
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${e(product.name)} | Kary Curadoria</title>
<meta name="description" content="${e(og.description)}">
<link rel="canonical" href="${e(canonical)}">
<meta property="og:title" content="${e(og.title)}">
<meta property="og:description" content="${e(og.description)}">
<meta property="og:url" content="${e(canonical)}">
<meta property="og:site_name" content="Kary Curadoria">
<meta property="og:locale" content="pt_BR">
<meta property="og:type" content="product">
<meta property="og:image" content="${e(og.image.url)}">
<meta property="og:image:secure_url" content="${e(og.image.url)}">
${og.image.type ? `<meta property="og:image:type" content="${e(og.image.type)}">\n` : ""}<meta property="og:image:width" content="${og.image.width}">
${og.image.height ? `<meta property="og:image:height" content="${og.image.height}">\n` : ""}<meta property="og:image:alt" content="${e(og.image.alt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${e(og.title)}">
<meta name="twitter:description" content="${e(og.description)}">
<meta name="twitter:image" content="${e(og.image.url)}">
<meta property="product:brand" content="${e(CATALOG_BRAND)}">
<meta property="product:availability" content="${inStock ? "in stock" : "out of stock"}">
<meta property="product:condition" content="new">
<meta property="product:price:amount" content="${item.price.toFixed(2)}">
<meta property="product:price:currency" content="${CATALOG_CURRENCY}">
${item.salePrice != null ? `<meta property="product:sale_price:amount" content="${item.salePrice.toFixed(2)}">\n<meta property="product:sale_price:currency" content="${CATALOG_CURRENCY}">\n` : ""}<meta property="product:retailer_item_id" content="${e(item.id)}">
<meta property="product:item_group_id" content="${e(item.groupId)}">
<script type="application/ld+json">${jsonLdHtml}</script>
</head>
<body><a href="${href}">${e(product.name)}</a></body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", ...NO_STORE, "X-Link-Curto": "preview" },
  });
}
