import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SizeInsert, SizeUpdate } from "@/types/database";

export const dynamic = "force-dynamic";

// GET /api/admin/sizes
export async function GET() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("sizes")
    .select("*")
    .order("order_index", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/admin/sizes
export async function POST(request: NextRequest) {
  const admin = createAdminClient();
  const body: SizeInsert = await request.json();

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
  }

  const { data, error } = await admin
    .from("sizes")
    .insert({
      name: body.name.trim(),
      order_index: body.order_index ?? 0,
      active: body.active ?? true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// PUT /api/admin/sizes — { id, ...fields }
export async function PUT(request: NextRequest) {
  const admin = createAdminClient();
  const body: SizeUpdate & { id: string } = await request.json();

  if (!body.id) return NextResponse.json({ error: "ID obrigatório." }, { status: 400 });

  const { id, ...patch } = body;
  const { data, error } = await admin
    .from("sizes")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
