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
  return {
    title: product.name,
    description: product.description ?? `Compre ${product.name} na Kary Curadoria.`,
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

  return (
    <ProductClient
      product={product as Product & { categories: Category | null }}
      variants={variants}
      colorHexMap={colorHexMap}
    />
  );
}
