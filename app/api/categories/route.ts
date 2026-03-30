import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withRetry } from "@/lib/supabase/retry";
import type { CategoryInsert } from "@/types/database";

// GET /api/categories — List all categories
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";

    let query = supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true });

    if (activeOnly) {
      query = query.eq("active", true);
    }

    const { data, error } = await withRetry(() => query);

    if (error) {
      console.error("[categories GET] Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("[categories GET] Catch error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/categories — Create a new category
export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

  try {
    const body: CategoryInsert = await request.json();

    if (!body.name || !body.slug) {
      return NextResponse.json(
        { error: "Nome e slug sao obrigatorios." },
        { status: 400 }
      );
    }

    const { data, error } = await withRetry(() =>
      supabase.from("categories").insert(body).select().single()
    );

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Ja existe uma categoria com este slug." },
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
