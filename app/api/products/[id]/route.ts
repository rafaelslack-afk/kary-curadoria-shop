import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProductUpdate } from "@/types/database";

// GET /api/products/[id] — Get a single product with variants
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createAdminClient();

  // Tenta incluir bundle_items; se a tabela ainda não existir, faz query sem ela
  let { data, error } = await supabase
    .from("products")
    .select("*, product_variants(*), product_bundle_items(*, product_variants(*)), categories(id, name, slug)")
    .eq("id", params.id)
    .single();

  if (error?.message?.includes("product_bundle_items")) {
    ({ data, error } = await supabase
      .from("products")
      .select("*, product_variants(*), categories(id, name, slug)")
      .eq("id", params.id)
      .single());
  }

  if (error) {
    return NextResponse.json(
      { error: "Produto nao encontrado." },
      { status: 404 }
    );
  }

  return NextResponse.json({ product_bundle_items: [], ...data });
}

// PUT /api/products/[id] — Update a product
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createAdminClient();

  try {
    const body: ProductUpdate & {
      bundle_items?: { variant_id: string; quantity: number }[];
    } = await request.json();

    const bundleItems = body.bundle_items;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { bundle_items: _bi, ...productData } = body;

    const { data, error } = await supabase
      .from("products")
      .update(productData)
      .eq("id", params.id)
      .select("*, product_variants(*), product_bundle_items(*, product_variants(*)), categories(id, name, slug)")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Ja existe um produto com este slug." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Upsert bundle_items: delete existing then reinsert
    if (bundleItems !== undefined) {
      await supabase
        .from("product_bundle_items")
        .delete()
        .eq("bundle_product_id", params.id);

      if (bundleItems.length > 0) {
        const { error: bundleError } = await supabase
          .from("product_bundle_items")
          .insert(bundleItems.map((bi) => ({
            bundle_product_id: params.id,
            variant_id:        bi.variant_id,
            quantity:          bi.quantity,
          })));

        if (bundleError) {
          return NextResponse.json({ error: bundleError.message }, { status: 500 });
        }
      }

      // Refetch with updated bundle items
      const { data: refreshed } = await supabase
        .from("products")
        .select("*, product_variants(*), product_bundle_items(*, product_variants(*)), categories(id, name, slug)")
        .eq("id", params.id)
        .single();

      return NextResponse.json(refreshed);
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Dados invalidos." },
      { status: 400 }
    );
  }
}

// DELETE /api/products/[id] — Delete a product and its variants
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createAdminClient();

  // Bloquear se há pedidos vinculados
  const { count: orderCount } = await supabase
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("product_id", params.id);

  if (orderCount && orderCount > 0) {
    return NextResponse.json(
      { error: "Este produto possui pedidos vinculados. Desative-o em vez de excluir." },
      { status: 409 }
    );
  }

  // Bloquear se alguma variante deste produto é componente de um conjunto
  const { data: variants } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", params.id);

  if (variants && variants.length > 0) {
    const variantIds = variants.map((v) => v.id);
    const { count: bundleCount } = await supabase
      .from("product_bundle_items")
      .select("id", { count: "exact", head: true })
      .in("variant_id", variantIds);

    if (bundleCount && bundleCount > 0) {
      return NextResponse.json(
        { error: "Uma ou mais variações deste produto fazem parte de um conjunto. Remova-as dos conjuntos antes de excluir." },
        { status: 409 }
      );
    }
  }

  // Excluir bundle_items deste produto (se for conjunto) — CASCADE já faria, mas explicitando
  await supabase
    .from("product_bundle_items")
    .delete()
    .eq("bundle_product_id", params.id);

  // Excluir variantes
  await supabase
    .from("product_variants")
    .delete()
    .eq("product_id", params.id);

  // Excluir produto
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
