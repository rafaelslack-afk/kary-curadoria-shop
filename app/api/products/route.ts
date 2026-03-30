import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withRetry } from "@/lib/supabase/retry";
import type { ProductInsert } from "@/types/database";

// GET /api/products — List products with optional filters
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";
    const featured = searchParams.get("featured") === "true";
    const categoryId = searchParams.get("category_id");
    const search = searchParams.get("search");

    const withVariants = searchParams.get("with_variants") === "true";
    const typeFilter   = searchParams.get("type");

    const selectCols = withVariants
      ? "*, product_variants(*), categories(id, name, slug)"
      : "*, categories(id, name, slug)";

    let query = supabase
      .from("products")
      .select(selectCols)
      .order("created_at", { ascending: false });

    if (activeOnly) query = query.eq("active", true);
    if (featured) query = query.eq("featured", true);
    if (categoryId) query = query.eq("category_id", categoryId);
    if (search) query = query.ilike("name", `%${search}%`);
    if (typeFilter) query = query.eq("product_type", typeFilter);

    const { data, error } = await withRetry(() => query);

    if (error) {
      console.error("[products GET] Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("[products GET] Catch error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/products — Create a new product
export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

  try {
    const body: ProductInsert & {
      variants?:     { size: string; color?: string | null; sku: string; stock_qty: number; stock_min?: number }[];
      bundle_items?: { variant_id: string; quantity: number }[];
    } = await request.json();

    if (!body.name || !body.slug || !body.price) {
      return NextResponse.json(
        { error: "Nome, slug e preco sao obrigatorios." },
        { status: 400 }
      );
    }

    const productType  = body.product_type ?? "individual";
    const variants     = body.variants     ?? [];
    const bundleItems  = body.bundle_items ?? [];

    // Validações por tipo
    if (productType === "conjunto" && bundleItems.length === 0) {
      return NextResponse.json(
        { error: "Um conjunto precisa de pelo menos 1 componente." },
        { status: 400 }
      );
    }

    // Extrair campos que não vão para a tabela products
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { variants: _v, bundle_items: _b, ...productData } = body;

    // Inserir produto
    const { data: product, error: productError } = await supabase
      .from("products")
      .insert(productData)
      .select()
      .single();

    if (productError) {
      if (productError.code === "23505") {
        return NextResponse.json(
          { error: "Ja existe um produto com este slug." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: productError.message }, { status: 500 });
    }

    // Inserir variantes (individual)
    if (productType === "individual" && variants.length > 0) {
      const variantsData = variants.map((v) => ({
        product_id: product.id,
        size:      v.size,
        color:     v.color ?? null,
        sku:       v.sku,
        stock_qty: v.stock_qty || 0,
        stock_min: v.stock_min ?? 3,
      }));

      const { error: variantsError } = await supabase
        .from("product_variants")
        .insert(variantsData);

      if (variantsError) {
        await supabase.from("products").delete().eq("id", product.id);
        return NextResponse.json(
          { error: `Erro ao criar variacoes: ${variantsError.message}` },
          { status: 500 }
        );
      }
    }

    // Inserir componentes do conjunto
    if (productType === "conjunto" && bundleItems.length > 0) {
      const { error: bundleError } = await supabase
        .from("product_bundle_items")
        .insert(bundleItems.map((bi) => ({
          bundle_product_id: product.id,
          variant_id:        bi.variant_id,
          quantity:          bi.quantity,
        })));

      if (bundleError) {
        await supabase.from("products").delete().eq("id", product.id);
        return NextResponse.json(
          { error: `Erro ao criar componentes do conjunto: ${bundleError.message}` },
          { status: 500 }
        );
      }
    }

    // Retornar produto completo
    const { data: fullProduct } = await supabase
      .from("products")
      .select("*, product_variants(*), product_bundle_items(*, product_variants(*)), categories(id, name, slug)")
      .eq("id", product.id)
      .single();

    return NextResponse.json(fullProduct, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Dados invalidos." },
      { status: 400 }
    );
  }
}
