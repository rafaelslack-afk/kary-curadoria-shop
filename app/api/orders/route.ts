import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/orders
// Lista todos os pedidos para o painel admin (ordenados do mais recente ao mais antigo)

export async function GET() {
  const admin = createAdminClient();
  const { data: orders, error } = await admin
    .from("orders")
    .select(
      "id, order_number, guest_name, guest_email, status, payment_method, total, created_at, tracking_code, shipping_service, shipping_deadline"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[Orders GET] Erro ao listar pedidos:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(orders ?? [], {
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
}
