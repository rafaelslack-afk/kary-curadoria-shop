import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProductVariantInsert, ProductVariantUpdate } from "@/types/database";

// GET /api/products/[id]/variants — List variants for a product
export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("product_variants")
    .select("*")
    .eq("product_id", params.id)
    .order("sku", { ascending: true });

  // ── Diagnóstico temporário ─────────────────────────────────────────────────
  console.log(`[Variants API] product_id queried: ${params.id}`);
  console.log(`[Variants API] total rows returned: ${data?.length ?? 0}`);
  if (error) console.error(`[Variants API] query error:`, JSON.stringify(error));
  console.log(`[Variants API] SKUs returned:`, data?.map((v) => v.sku));
  const inResult = data?.find((v) => v.sku === "CON-0006-CRUA-M");
  console.log(`[Variants API] CON-0006-CRUA-M in result: ${!!inResult}`);

  // Busca a variante pelo UUID fixo para revelar o product_id real no banco
  const MISSING_ID = "31095030-06cd-4cba-889a-5a961d66f965";
  const { data: byId, error: byIdErr } = await supabase
    .from("product_variants")
    .select("id, sku, product_id, size, color, active, stock_qty")
    .eq("id", MISSING_ID)
    .maybeSingle();
  console.log(`[Variants API] lookup by UUID ${MISSING_ID}:`, byId ?? "(not found)");
  if (byIdErr) console.error(`[Variants API] UUID lookup error:`, JSON.stringify(byIdErr));
  if (byId) {
    console.log(`[Variants API] variant product_id in DB: ${byId.product_id}`);
    console.log(`[Variants API] product_id match: ${byId.product_id === params.id}`);
  }
  // ── Fim diagnóstico ────────────────────────────────────────────────────────

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/products/[id]/variants — Add a variant to a product
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createAdminClient();

  try {
    const body: Omit<ProductVariantInsert, "product_id"> = await request.json();

    if (!body.size || !body.sku) {
      return NextResponse.json(
        { error: "Tamanho e SKU sao obrigatorios." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("product_variants")
      .insert({
        product_id: params.id,
        size: body.size,
        color: (body as { color?: string | null }).color ?? null,
        sku: body.sku,
        stock_qty: body.stock_qty ?? 0,
        stock_min: body.stock_min ?? 3,
        active: body.active ?? true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Ja existe uma variacao com este SKU." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Dados invalidos." },
      { status: 400 }
    );
  }
}

// PUT /api/products/[id]/variants — Update a variant (variant_id in body)
export async function PUT(request: NextRequest) {
  const supabase = createAdminClient();

  try {
    const body: ProductVariantUpdate & { variant_id: string } =
      await request.json();

    if (!body.variant_id) {
      return NextResponse.json(
        { error: "variant_id e obrigatorio." },
        { status: 400 }
      );
    }

    const { variant_id, ...updateData } = body;

    const { data, error } = await supabase
      .from("product_variants")
      .update(updateData)
      .eq("id", variant_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Dados invalidos." },
      { status: 400 }
    );
  }
}

// DELETE /api/products/[id]/variants — Delete a variant (variant_id in body)
export async function DELETE(request: NextRequest) {
  const supabase = createAdminClient();

  try {
    const { variant_id } = await request.json();

    if (!variant_id) {
      return NextResponse.json(
        { error: "variant_id e obrigatorio." },
        { status: 400 }
      );
    }

    // Check if variant has orders
    const { count } = await supabase
      .from("order_items")
      .select("id", { count: "exact", head: true })
      .eq("variant_id", variant_id);

    if (count && count > 0) {
      return NextResponse.json(
        { error: "Esta variacao possui pedidos vinculados." },
        { status: 409 }
      );
    }

    const { error } = await supabase
      .from("product_variants")
      .delete()
      .eq("id", variant_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Variacao excluida com sucesso." });
  } catch {
    return NextResponse.json(
      { error: "Dados invalidos." },
      { status: 400 }
    );
  }
}
