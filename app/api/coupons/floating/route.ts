import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const admin = createAdminClient();

  const { data } = await admin
    .from("coupons")
    .select("code, floating_title, floating_description, value, type")
    .eq("is_floating", true)
    .eq("active", true)
    .single();

  if (!data) {
    return NextResponse.json(null, {
      headers: { "Cache-Control": "no-store" },
    });
  }
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
