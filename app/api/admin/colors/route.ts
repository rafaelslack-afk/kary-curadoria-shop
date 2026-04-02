import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ColorInsert, ColorUpdate } from "@/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/colors
export async function GET() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("colors")
    .select("*")
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/admin/colors
export async function POST(request: NextRequest) {
  const admin = createAdminClient();
  const body: ColorInsert = await request.json();

  if (!body.name?.trim() || !body.hex_code?.trim()) {
    return NextResponse.json({ error: "Nome e hex_code são obrigatórios." }, { status: 400 });
  }

  const { data, error } = await admin
    .from("colors")
    .insert({ name: body.name.trim(), hex_code: body.hex_code.trim(), active: body.active ?? true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// PUT /api/admin/colors — { id, ...fields }
export async function PUT(request: NextRequest) {
  const admin = createAdminClient();
  const body: ColorUpdate & { id: string } = await request.json();

  if (!body.id) return NextResponse.json({ error: "ID obrigatório." }, { status: 400 });

  const { id, ...patch } = body;
  const { data, error } = await admin
    .from("colors")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
