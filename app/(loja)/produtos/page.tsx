import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { CatalogClient } from "./catalog-client";
import { getCatalogSeo } from "@/lib/catalog-seo";
import type { Category, Product } from "@/types/database";

export const revalidate = 60;

interface Props {
  searchParams: { categoria?: string };
}

// A página lê searchParams em generateMetadata (SEO por categoria) e por isso
// é renderizada a cada visita; o cache dos dados limita o banco a ~1 ida/min.
const loadProductsAndCategories = unstable_cache(
  async () => {
    const supabase = createAdminClient();

    const [productsRes, categoriesRes] = await Promise.all([
      supabase
        .from("products")
        .select(`*, categories(id, name, slug), product_variants(stock_qty)`)
        .eq("active", true)
        .order("created_at", { ascending: false }),
      supabase
        .from("categories")
        .select("*")
        .eq("active", true)
        .order("name"),
    ]);

    // Lança em erro para o unstable_cache não guardar uma lista vazia
    if (productsRes.error || categoriesRes.error) {
      throw new Error(productsRes.error?.message ?? categoriesRes.error?.message);
    }

    const products = (productsRes.data ?? []).map((p) => ({
      ...p,
      total_stock: (p.product_variants as { stock_qty: number }[]).reduce(
        (sum: number, v: { stock_qty: number }) => sum + v.stock_qty,
        0
      ),
    }));

    return { products, categories: categoriesRes.data ?? [] };
  },
  ["loja-catalogo"],
  { revalidate: 60 }
);

async function getProductsAndCategories() {
  try {
    return await loadProductsAndCategories();
  } catch {
    return { products: [], categories: [] }; // banco acordando
  }
}

export async function generateMetadata({ searchParams }: Props) {
  const seo = getCatalogSeo(searchParams.categoria);
  const url = searchParams.categoria
    ? `https://karycuradoria.com.br/produtos?categoria=${searchParams.categoria}`
    : "https://karycuradoria.com.br/produtos";

  return {
    // title.absolute — o mapa de SEO já inclui "| Kary Curadoria" no fim;
    // sem isso, o template do layout raiz ("%s | Kary Curadoria") duplicaria
    // o sufixo no <title> renderizado.
    title: { absolute: seo.title },
    description: seo.description,
    openGraph: {
      title: seo.title,
      description: seo.description,
      url,
      siteName: "Kary Curadoria",
      locale: "pt_BR",
      type: "website",
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Kary Curadoria" }],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: ["/opengraph-image"],
    },
  };
}

export default async function ProdutosPage() {
  const { products, categories } = await getProductsAndCategories();
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-6 py-16 text-center text-kc-muted text-sm">Carregando coleção…</div>}>
      <CatalogClient
        products={products as (Product & { total_stock: number; categories: Category | null })[]}
        categories={categories}
      />
    </Suspense>
  );
}
