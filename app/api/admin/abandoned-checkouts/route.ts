import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/abandoned-checkouts
// Parâmetros: period (7d | 30d | all), status (all | abandoned | recovered)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? "7d";
  const status = searchParams.get("status") ?? "all";

  const admin = createAdminClient();

  let query = admin
    .from("abandoned_checkouts")
    .select("id, name, email, phone, cart_items, cart_total, recovered, order_id, created_at")
    .order("created_at", { ascending: false });

  // Filtro de período
  if (period === "7d") {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte("created_at", since);
  } else if (period === "30d") {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte("created_at", since);
  }

  // Filtro de status
  if (status === "abandoned") {
    query = query.eq("recovered", false);
  } else if (status === "recovered") {
    query = query.eq("recovered", true);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
