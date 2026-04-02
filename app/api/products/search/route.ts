import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/products/search?q=texto
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json([]);
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from("products")
    .select("id, name, slug, price, images")
    .eq("active", true)
    .ilike("name", `%${q}%`)
    .limit(5);

  if (error) {
    return NextResponse.json([], { status: 500 });
  }

  const results = (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    image: Array.isArray(p.images) ? (p.images[0] ?? null) : null,
  }));

  return NextResponse.json(results);
}
