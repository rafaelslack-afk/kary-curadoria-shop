import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface CartItemRow {
  product_id?: string;
  product_name: string;
  variant_id?: string;
  sku?: string;
  size?: string;
  color?: string | null;
  quantity: number;
  unit_price: number;
  image_url?: string | null;
}

// GET /api/checkout/resume/[id]
// Usado pela página /retomar/[id] para restaurar um carrinho abandonado.
// Passa pelo admin client porque abandoned_checkouts tem RLS sem policy
// de leitura pública (o id da URL funciona como token de acesso).
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Carrinho não encontrado." }, { status: 404 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("abandoned_checkouts")
    .select("cart_items")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Carrinho não encontrado." }, { status: 404 });
  }

  const cartItems = (data.cart_items ?? []) as CartItemRow[];
  const productIds = Array.from(
    new Set(cartItems.map((i) => i.product_id).filter(Boolean))
  ) as string[];

  let slugByProductId: Record<string, string> = {};
  if (productIds.length > 0) {
    const { data: products } = await admin
      .from("products")
      .select("id, slug")
      .in("id", productIds);
    slugByProductId = Object.fromEntries((products ?? []).map((p) => [p.id, p.slug]));
  }

  const items = cartItems
    .filter((i) => i.variant_id && i.product_id)
    .map((i) => ({
      variantId: i.variant_id!,
      productId: i.product_id!,
      productName: i.product_name,
      slug: slugByProductId[i.product_id!] ?? "",
      size: i.size ?? "",
      color: i.color ?? null,
      sku: i.sku ?? "",
      price: i.unit_price,
      image: i.image_url ?? null,
      quantity: i.quantity,
    }));

  if (items.length === 0) {
    return NextResponse.json({ error: "Carrinho não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ items });
}
