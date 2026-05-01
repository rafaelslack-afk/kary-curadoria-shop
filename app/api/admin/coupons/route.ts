import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const admin = createAdminClient();
  const body = await request.json();

  const {
    code, type, value, min_order, max_uses, expires_at, active,
    is_floating, floating_title, floating_description,
  } = body;

  if (!code || !type || value == null) {
    return NextResponse.json({ error: "Campos obrigatórios: code, type, value." }, { status: 400 });
  }

  // Se vai ser flutuante, desativar outros cupons flutuantes antes
  if (is_floating) {
    await admin.from("coupons").update({ is_floating: false }).eq("is_floating", true);
  }

  const { data, error } = await admin
    .from("coupons")
    .insert({
      code: String(code).toUpperCase().trim(),
      type,
      value: Number(value),
      min_order: min_order ? Number(min_order) : 0,
      max_uses: max_uses ? Number(max_uses) : null,
      expires_at: expires_at || null,
      active: active ?? true,
      is_floating: is_floating ?? false,
      floating_title: floating_title || null,
      floating_description: floating_description || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/", "layout");
  return NextResponse.json(data, { status: 201 });
}
