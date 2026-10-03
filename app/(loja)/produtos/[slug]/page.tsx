import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 30;
import type { Product, ProductVariant, Category } from "@/types/database";
import { ProductClient } from "./product-client";
import { RelatedProducts } from "@/components/loja/RelatedProducts";
import { BenefitsBar } from "@/components/loja/BenefitsBar";
import { buildProductOg } from "@/lib/product-og";

interface Props {
  params: { slug: string };
}

async function getProduct(slug: string) {
  const supabase = createAdminClient();
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
