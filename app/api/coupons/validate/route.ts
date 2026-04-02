import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code")?.trim().toUpperCase();
  const subtotal = parseFloat(searchParams.get("subtotal") ?? "0");

  if (!code) {
    return NextResponse.json({ error: "Informe o código do cupom." }, { status: 400 });
  }

  console.log("[cupom] código recebido:", code, "| subtotal:", subtotal);

  // Admin client bypassa RLS (tabela coupons tem RLS ativada)
  const admin = createAdminClient();
  const { data: coupon, error } = await admin
    .from("coupons")
    .select("*")
    .ilike("code", code)
    .eq("active", true)
    .single();

  console.log("[cupom] resultado:", coupon, "| error:", error?.message);

  if (error || !coupon) {
    return NextResponse.json({ error: "Cupom não encontrado ou inativo." }, { status: 404 });
  }

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return NextResponse.json({ error: "Este cupom expirou." }, { status: 400 });
  }

  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
    return NextResponse.json({ error: "Este cupom atingiu o limite de uso." }, { status: 400 });
  }

  if (subtotal < coupon.min_order) {
    return NextResponse.json(
      { error: `Pedido mínimo de ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(coupon.min_order)} para usar este cupom.` },
      { status: 400 }
    );
  }

  return NextResponse.json({
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    min_order: coupon.min_order,
  });
}
