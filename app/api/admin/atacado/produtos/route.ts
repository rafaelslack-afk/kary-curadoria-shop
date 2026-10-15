import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createNoStoreAdminClient } from "@/lib/supabase/admin-no-store";
import { getRegraPrecoAtacado } from "@/lib/atacado/config";
import { precoAtacado } from "@/lib/atacado/pricing";
import { sortSizes } from "@/lib/atacado/types";
import { variantesDisponiveisAtacado } from "@/lib/atacado/disponibilidade";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/atacado/produtos?q=texto — busca de produto para adicionar
// a um pedido de atacado, com o preço sugerido pela regra de atacado por
// variante (cor × tamanho) nas duas formas de pagamento. Só variantes
// disponíveis (ativas e com stock_qty > 0), a mesma regra do catálogo.
export async function GET(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().replace(/[%,()*]/g, " ").slice(0, 60);
  if (q.length < 2) return NextResponse.json({ products: [] });

  const db = createNoStoreAdminClient();
  const { data, error } = await db
    .from("products")
    .select("id, name, sku_base, price, images, product_variants(id, color, size, sku, active, stock_qty)")
    .eq("active", true)
    .eq("atacado_enabled", true) // só peças ativadas no atacado
    .or(`name.ilike.%${q}%,sku_base.ilike.%${q}%`)
    .limit(15);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const regra = await getRegraPrecoAtacado();
  type Row = {
    id: string;
    name: string;
    sku_base: string | null;
    price: number | string;
    images: string[] | null;
    product_variants: { id: string; color: string | null; size: string; sku: string | null; active: boolean; stock_qty: number }[];
  };
  const products = ((data ?? []) as unknown as Row[]).map((p) => {
    const variants = variantesDisponiveisAtacado(p.product_variants);
    const order = sortSizes(variants.map((v) => v.size));
    return {
      id: p.id,
      name: p.name,
      reference: p.sku_base,
      price: Number(p.price),
      image: p.images?.[0] ?? null,
      variants: variants
        .sort((a, b) => (a.color ?? "").localeCompare(b.color ?? "", "pt-BR") || order.indexOf(a.size) - order.indexOf(b.size))
        .map((v) => ({
          id: v.id,
          color: v.color ?? "Única",
          size: v.size,
          sku: v.sku,
          suggested: {
            pix: precoAtacado(Number(p.price), v.size, "pix", regra),
            credit_card: precoAtacado(Number(p.price), v.size, "credit_card", regra),
          },
        })),
    };
  });

  return NextResponse.json({ products }, { headers: { "Cache-Control": "no-store" } });
}
