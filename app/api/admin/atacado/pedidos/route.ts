import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createNoStoreAdminClient } from "@/lib/supabase/admin-no-store";
import { isStatusAtacado } from "@/lib/atacado/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/atacado/pedidos?status=novo&q=texto — lista de pedidos de atacado
export async function GET(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const status = request.nextUrl.searchParams.get("status") ?? "";
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);

  const db = createNoStoreAdminClient();
  let query = db
    .from("wholesale_orders")
    .select(
      "id, order_number, status, payment_method, customer_name, store_name, document, address_json, pieces_count, total, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(300);

  if (isStatusAtacado(status)) query = query.eq("status", status);
  if (q) {
    // Busca por número, nome ou CPF/CNPJ (só dígitos)
    const safe = q.replace(/[%,()*]/g, " ");
    const digits = q.replace(/\D/g, "");
    const filters = [`order_number.ilike.%${safe}%`, `customer_name.ilike.%${safe}%`, `store_name.ilike.%${safe}%`];
    if (digits.length >= 3) filters.push(`document.ilike.%${digits}%`);
    query = query.or(filters.join(","));
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ orders: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}
