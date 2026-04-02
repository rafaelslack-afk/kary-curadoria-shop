import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CategoryUpdate } from "@/types/database";

// GET /api/categories/[id] — Get a single category
export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error) {
    return NextResponse.json({ error: "Categoria nao encontrada." }, { status: 404 });
  }

  return NextResponse.json(data);
}

// PUT /api/categories/[id] — Update a category
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createAdminClient();

  try {
    const body: CategoryUpdate = await request.json();

    const { data, error } = await supabase
      .from("categories")
      .update(body)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Ja existe uma categoria com este slug." },
          { status: 409 }
        );
      }
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

// DELETE /api/categories/[id] — Delete a category
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createAdminClient();

  // Check if category has products
  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", params.id);

  if (count && count > 0) {
    return NextResponse.json(
      {
        error: `Esta categoria possui ${count} produto(s). Remova ou mova os produtos antes de excluir.`,
      },
      { status: 409 }
    );
  }

  // Check if category has subcategories
  const { count: subCount } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", params.id);

  if (subCount && subCount > 0) {
    return NextResponse.json(
      {
        error: `Esta categoria possui ${subCount} subcategoria(s). Remova as subcategorias antes de excluir.`,
      },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Categoria excluida com sucesso." });
}
