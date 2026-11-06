import { cache } from "react";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 30;
import type { Product, ProductVariant, Category } from "@/types/database";
import { ProductClient } from "./product-client";
import { RelatedProducts } from "@/components/loja/RelatedProducts";
import { BenefitsBar } from "@/components/loja/BenefitsBar";
import { buildProductOg } from "@/lib/product-og";
import { buildCatalogItems, representativeItem } from "@/lib/meta-catalog";

interface Props {
  params: { slug: string };
}

// cache() do React: generateMetadata e a página compartilham a mesma consulta
const getProduct = cache(async (slug: string) => {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select(`
      *,
      categories(id, name, slug),
      product_variants(*)
    `)
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  // Erro de consulta (timeout, instabilidade do banco) não é "produto não
  // encontrado": lança em vez de cair no notFound(), para o ISR não guardar
  // um 404 em cache — a versão anterior da página continua sendo servida.
  if (error) {
    console.error("[produto] erro ao carregar", { slug, error });
    throw new Error(`Falha ao carregar produto ${slug}: ${error.message}`);
  }
  return data;
});

// Cores mudam raramente: cache de 5 min entre renders de qualquer produto
const getColors = unstable_cache(
  async (): Promise<Record<string, string>> => {
    const admin = createAdminClient();
    const { data, error } = await admin.from("colors").select("name, hex_code");
    // Lança em erro para o unstable_cache não guardar um mapa vazio
    if (error) throw new Error(`Falha ao carregar cores: ${error.message}`);
    const map: Record<string, string> = {};
    for (const c of data ?? []) {
      map[c.name] = c.hex_code;
    }
    return map;
  },
  ["loja-colors"],
  { revalidate: 300 }
);

export async function generateMetadata({ params }: Props) {
  const product = await getProduct(params.slug);
  if (!product) return { title: "Produto não encontrado" };

  const og = buildProductOg(product);

  return {
    title: product.name,
    description: og.description,
    openGraph: {
      title: og.title,
      description: og.description,
      url: og.url,
      siteName: "Kary Curadoria",
      locale: "pt_BR",
      type: "website",
      images: [og.image],
    },
    twitter: {
      card: "summary_large_image",
      title: og.title,
      description: og.description,
      images: [og.image.url],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const [product, colorHexMap] = await Promise.all([
    getProduct(params.slug),
    getColors(),
  ]);

  if (!product) notFound();

  const SIZE_ORDER = ["PP", "P", "M", "G", "GG", "G1", "G2", "G3", "GGG", "XG", "EG", "Único"];

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

  // IDs do catálogo da Meta (/feed.xml): o Pixel lê este JSON-LD na página
  const catalogItem = product.sku_base
    ? representativeItem(buildCatalogItems({ ...product, sku_base: product.sku_base }))
    : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: catalogItem?.id,
    productGroupID: catalogItem?.groupId,
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
      itemCondition: "https://schema.org/NewCondition",
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
      <div className="max-w-7xl mx-auto px-4 lg:px-6 pb-6">
        <BenefitsBar />
      </div>
      <RelatedProducts
        categoryId={product.category_id}
        excludeId={product.id}
      />
    </>
  );
}
