import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Product, ProductVariant, Category } from "@/types/database";
import { ProductClient } from "./product-client";

interface Props {
  params: { slug: string };
}

async function getProduct(slug: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("products")
    .select(`
      *,
      categories(id, name, slug),
      product_variants(*)
    `)
    .eq("slug", slug)
    .eq("active", true)
    .single();
  return data;
}

async function getColors(): Promise<Record<string, string>> {
  const admin = createAdminClient();
  const { data } = await admin.from("colors").select("name, hex_code");
  const map: Record<string, string> = {};
  for (const c of data ?? []) {
    map[c.name] = c.hex_code;
  }
  return map;
}

export async function generateMetadata({ params }: Props) {
  const product = await getProduct(params.slug);
  if (!product) return { title: "Produto não encontrado" };

  const description =
    product.description?.substring(0, 160) ??
    `${product.name} — Kary Curadoria. Moda clássica e elegante direto do Brás, SP.`;

  // Truncar título OG para ≤ 60 caracteres (limite recomendado por crawlers)
  const ogTitle =
    product.name.length > 60
      ? product.name.slice(0, 57) + "..."
      : product.name;

  // Adicionar transformação Supabase para reduzir peso da imagem (< 600 KB)
  // width/height=1200 mantém proporção 1:1 (ideal para produto de moda)
  // quality=75 e format=webp reduzem drasticamente o tamanho
  const rawImage = product.images?.[0];
  const ogImageUrl = rawImage
    ? `${rawImage}?width=1200&height=1200&quality=75&format=webp`
    : "/opengraph-image";

  const ogImage = rawImage
    ? { url: ogImageUrl, width: 1200, height: 1200, alt: ogTitle, type: "image/webp" }
    : { url: "/opengraph-image", width: 1200, height: 630, alt: "Kary Curadoria" };

  return {
    title: product.name,
    description,
    openGraph: {
      title: ogTitle,
      description,
      url: `https://karycuradoria.com.br/produtos/${params.slug}`,
      siteName: "Kary Curadoria",
      locale: "pt_BR",
      type: "website",
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const [product, colorHexMap] = await Promise.all([
    getProduct(params.slug),
    getColors(),
  ]);

  if (!product) notFound();

  const SIZE_ORDER = ["PP", "P", "M", "G", "GG", "XG", "EG", "Único"];

  const variants = (product.product_variants as ProductVariant[])
    .filter((v) => v.active)
    .sort((a, b) => {
      const ai = SIZE_ORDER.indexOf(a.size);
      const bi = SIZE_ORDER.indexOf(b.size);
      if (ai === -1 && bi === -1) return a.size.localeCompare(b.size);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

  const totalStock = variants.reduce((sum, v) => sum + v.stock_qty, 0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    image: product.images ?? [],
    brand: {
      "@type": "Brand",
      name: "Kary Curadoria",
    },
    offers: {
      "@type": "Offer",
      url: `https://karycuradoria.com.br/produtos/${product.slug}`,
      priceCurrency: "BRL",
      price: product.price,
      availability:
        totalStock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: "Kary Curadoria",
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductClient
        product={product as Product & { categories: Category | null }}
        variants={variants}
        colorHexMap={colorHexMap}
      />
    </>
  );
}
