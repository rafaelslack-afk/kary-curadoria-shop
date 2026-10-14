// Catálogo do atacado: produtos ativos e TODAS as variantes ativas (inclusive
// com estoque zero). Estoque nunca sai do servidor nem bloqueia o pedido.
// Server-only.
import { createNoStoreAdminClient } from "@/lib/supabase/admin-no-store";
import type { AtacadoProduct } from "@/lib/atacado/types";

export type { AtacadoProduct, AtacadoVariant } from "@/lib/atacado/types";

interface Row {
  id: string;
  slug: string;
  name: string;
  sku_base: string | null;
  description: string | null;
  price: number | string;
  images: string[] | null;
  created_at: string;
  categories: { slug: string; name: string } | null;
  product_variants: { id: string; color: string | null; size: string; sku: string | null; images: string[] | null; active: boolean }[];
}

function toProduct(r: Row): AtacadoProduct {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    reference: r.sku_base,
    description: r.description,
    price: Number(r.price),
    images: r.images ?? [],
    category: r.categories,
    createdAt: r.created_at,
    variants: (r.product_variants ?? [])
      .filter((v) => v.active)
      .map((v) => ({ id: v.id, color: v.color ?? "Única", size: v.size, sku: v.sku, images: v.images ?? [] })),
  };
}

const SELECT =
  "id, slug, name, sku_base, description, price, images, created_at, categories(slug, name), product_variants(id, color, size, sku, images, active)";

export async function getAtacadoCatalogo(): Promise<AtacadoProduct[]> {
  const db = createNoStoreAdminClient();
  const { data, error } = await db
    .from("products")
    .select(SELECT)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw new Error("catalogo_indisponivel");
  return ((data ?? []) as unknown as Row[]).map(toProduct).filter((p) => p.variants.length > 0);
}

export async function getAtacadoProduto(slug: string): Promise<AtacadoProduct | null> {
  const db = createNoStoreAdminClient();
  const { data } = await db.from("products").select(SELECT).eq("slug", slug).eq("active", true).maybeSingle();
  if (!data) return null;
  const p = toProduct(data as unknown as Row);
  return p.variants.length > 0 ? p : null;
}
