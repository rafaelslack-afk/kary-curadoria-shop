import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = createAdminClient();
  const { order_index } = await request.json();

  if (typeof order_index !== "number") {
    return NextResponse.json({ error: "order_index deve ser um número." }, { status: 400 });
  }

  const { data, error } = await admin
    .from("banners")
    .update({ order_index })
    .eq("id", params.id)
    .select("id, order_index")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
