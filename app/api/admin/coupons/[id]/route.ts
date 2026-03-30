import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = createAdminClient();
  const body = await request.json();

  const update: Record<string, unknown> = {};
  if (body.code !== undefined)       update.code       = String(body.code).toUpperCase().trim();
  if (body.type !== undefined)       update.type       = body.type;
  if (body.value !== undefined)      update.value      = Number(body.value);
  if (body.min_order !== undefined)  update.min_order  = body.min_order ? Number(body.min_order) : 0;
  if (body.max_uses !== undefined)   update.max_uses   = body.max_uses ? Number(body.max_uses) : null;
  if (body.expires_at !== undefined) update.expires_at = body.expires_at || null;
  if (body.active !== undefined)     update.active     = body.active;

  const { data, error } = await admin
    .from("coupons")
    .update(update)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
