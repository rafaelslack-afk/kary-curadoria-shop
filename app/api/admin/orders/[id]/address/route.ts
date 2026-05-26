import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// PATCH /api/admin/orders/[id]/address
// Atualiza campos do shipping_address_json mantendo os demais intactos.
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = createAdminClient();

  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const { cep, logradouro, numero, complemento, bairro, cidade, estado } = body;

  // Lê o endereço atual para fazer merge (preserva campos extras como telefone, etc.)
  const { data: order, error: fetchError } = await admin
    .from("orders")
    .select("shipping_address_json")
    .eq("id", params.id)
    .single();

  if (fetchError || !order) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  const current = (order.shipping_address_json as Record<string, unknown>) ?? {};

  // Merge: aplica apenas os campos presentes no body
  const merged = {
    ...current,
    ...(cep         !== undefined && { cep }),
    ...(logradouro  !== undefined && { logradouro }),
    ...(numero      !== undefined && { numero }),
    ...(complemento !== undefined && { complemento }),
    ...(bairro      !== undefined && { bairro }),
    ...(cidade      !== undefined && { cidade }),
    ...(estado      !== undefined && { estado }),
  };

  const { data, error } = await admin
    .from("orders")
    .update({
      shipping_address_json: merged,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .select("shipping_address_json")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ shipping_address_json: data.shipping_address_json });
}
