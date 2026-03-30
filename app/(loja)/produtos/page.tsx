import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { CatalogClient } from "./catalog-client";
import type { Category, Product } from "@/types/database";

async function getProductsAndCategories() {
  try {
    const supabase = createClient();

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

    const products = (productsRes.data ?? []).map((p) => ({
      ...p,
      total_stock: (p.product_variants as { stock_qty: number }[]).reduce(
        (sum: number, v: { stock_qty: number }) => sum + v.stock_qty,
        0
      ),
    }));

    return { products, categories: categoriesRes.data ?? [] };
  } catch {
    return { products: [], categories: [] }; // banco acordando
  }
}

export const metadata = {
  title: "Coleções",
  description: "Explore conjuntos de linho e alfaiataria casual da Kary Curadoria.",
};

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
