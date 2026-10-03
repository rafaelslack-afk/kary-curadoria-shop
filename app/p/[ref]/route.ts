import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildProductOg, shortProductUrl } from "@/lib/product-og";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /p/VES-0021 — link curto por referência (sku_base). É o link padrão de
// compartilhamento em DM do Instagram e WhatsApp (e o usado pelo assistente).
//
// - Navegador comum: redireciona para /produtos/<slug> com utm_source=link_curto
//   e utm_medium=dm, para o GA4 atribuir visitas e vendas ao link.
// - Crawler de preview (Meta/WhatsApp e afins): responde 200 com as mesmas
//   meta tags Open Graph da página do produto. Nem todo crawler segue
//   redirecionamento, e assim o card sai igual ao da página. O og:url é o
//   próprio link curto: tocar no card também passa pelo redirect com UTM.
// - Referência inexistente ou produto inativo: vai para /produtos.

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

function redirect(url: URL) {
  return NextResponse.redirect(url, { status: 302, headers: NO_STORE });
}

export async function GET(request: NextRequest, { params }: { params: { ref: string } }) {
  let ref = "";
  try {
    ref = decodeURIComponent(params.ref ?? "").trim().toUpperCase();
  } catch {
    // % malformado: trata como referência inexistente
  }
  const fallback = withUtm(new URL("/produtos", request.url));
  if (!/^[A-Z0-9-]{2,20}$/.test(ref)) return redirect(fallback);

  const admin = createAdminClient();
  const { data: product } = await admin
    .from("products")
    .select("name, slug, description, images")
    .ilike("sku_base", ref) // sem diferenciar maiúsculas/minúsculas
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  if (!product?.slug) return redirect(fallback);

  const destination = withUtm(new URL(`/produtos/${product.slug}`, request.url));

  const ua = request.headers.get("user-agent") ?? "";
  if (!PREVIEW_BOTS.test(ua)) return redirect(destination);

  const og = buildProductOg(product);
  const e = escapeHtml;
  const href = e(destination.toString());
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${e(product.name)} | Kary Curadoria</title>
<meta name="description" content="${e(og.description)}">
<link rel="canonical" href="${e(og.url)}">
<meta property="og:title" content="${e(og.title)}">
<meta property="og:description" content="${e(og.description)}">
<meta property="og:url" content="${e(shortProductUrl(ref))}">
<meta property="og:site_name" content="Kary Curadoria">
<meta property="og:locale" content="pt_BR">
<meta property="og:type" content="website">
<meta property="og:image" content="${e(og.image.url)}">
<meta property="og:image:secure_url" content="${e(og.image.url)}">
${og.image.type ? `<meta property="og:image:type" content="${e(og.image.type)}">\n` : ""}<meta property="og:image:width" content="${og.image.width}">
<meta property="og:image:height" content="${og.image.height}">
<meta property="og:image:alt" content="${e(og.image.alt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${e(og.title)}">
<meta name="twitter:description" content="${e(og.description)}">
<meta name="twitter:image" content="${e(og.image.url)}">
</head>
<body><a href="${href}">${e(product.name)}</a></body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", ...NO_STORE },
  });
}
