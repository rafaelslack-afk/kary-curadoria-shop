import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ValidateItem {
  variantId: string;
  productId: string;
  unit_price: number;
}

export async function POST(request: NextRequest) {
  let items: ValidateItem[];
  try {
    const body = await request.json();
    items = body.items;
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ updated: false, items: [] });
    }
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const admin = createAdminClient();
  const productIds = Array.from(new Set(items.map((i) => i.productId)));

  const { data: products } = await admin
    .from("products")
    .select("id, price, active")
    .in("id", productIds);

  if (!products) {
    return NextResponse.json({ updated: false, items: [] });
  }

  const productsMap = new Map(products.map((p) => [p.id, p]));

  const result = items.map((item) => {
    const product = productsMap.get(item.productId);
    if (!product) {
      return { variantId: item.variantId, productId: item.productId, current_price: item.unit_price, needs_update: false };
    }
    return {
      variantId: item.variantId,
      productId: item.productId,
      current_price: product.price,
      needs_update: Math.abs(product.price - item.unit_price) > 0.01,
      active: product.active,
    };
  });

  return NextResponse.json({
    updated: result.some((r) => r.needs_update),
    items: result,
  });
}
