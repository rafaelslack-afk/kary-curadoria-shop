import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CartItemPayload {
  product_id?: string;
  product_name: string;
  variant_id?: string;
  sku?: string;
  size?: string;
  color?: string | null;
  quantity: number;
  unit_price: number;
  image_url?: string | null;
}

interface AbandonedCheckoutBody {
  name?: string;
  email: string;
  phone?: string;
  cart_items: CartItemPayload[];
  cart_total?: number;
}

// POST /api/checkout/abandoned
// Salva ou atualiza um registro de abandono de checkout.
// Fire-and-forget pelo frontend — nunca bloqueia o fluxo do cliente.
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AbandonedCheckoutBody;

    if (!body.email || !body.cart_items?.length) {
      return NextResponse.json({ error: "email e cart_items são obrigatórios." }, { status: 400 });
    }

    const admin = createAdminClient();
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Verificar se já existe registro não recuperado nas últimas 24h
    const { data: existing } = await admin
      .from("abandoned_checkouts")
      .select("id")
      .eq("email", body.email.toLowerCase().trim())
      .eq("recovered", false)
      .gte("created_at", since24h)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      // Atualizar registro existente
      await admin
        .from("abandoned_checkouts")
        .update({
          name: body.name ?? null,
          phone: body.phone ?? null,
          cart_items: body.cart_items,
          cart_total: body.cart_total ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      return NextResponse.json({ id: existing.id, created: false });
    }

    // Inserir novo registro
    const { data: inserted, error: insertErr } = await admin
      .from("abandoned_checkouts")
      .insert({
        name: body.name ?? null,
        email: body.email.toLowerCase().trim(),
        phone: body.phone ?? null,
        cart_items: body.cart_items,
        cart_total: body.cart_total ?? null,
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("[abandoned_checkouts] Erro ao inserir:", insertErr.message);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ id: inserted.id, created: true });
  } catch (err) {
    console.error("[abandoned_checkouts] Erro inesperado:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
