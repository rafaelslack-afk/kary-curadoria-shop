import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Public — returns only active banners ordered by order_index
// Uses admin client to bypass RLS read policy (works server-side only)
export async function GET() {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("banners")
    .select(
      "id, title, subtitle, button_text, button_link, " +
      "image_desktop, image_mobile, text_position, text_color, order_index"
    )
    .eq("active", true)
    .order("order_index", { ascending: true });

  if (error) return NextResponse.json([], { status: 500 });
  return NextResponse.json(data ?? [], {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
