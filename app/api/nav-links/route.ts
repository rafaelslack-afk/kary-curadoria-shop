import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const revalidate = 60; // cache por 60s

// GET /api/nav-links — links ativos para a loja

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("nav_links")
      .select("id, label, href, order_index")
      .eq("active", true)
      .order("order_index", { ascending: true });

    if (error) throw error;

    return NextResponse.json(data ?? [], {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" },
    });
  } catch {
    // Fallback silencioso — navbar usará links hardcoded
    return NextResponse.json([], { status: 200 });
  }
}
