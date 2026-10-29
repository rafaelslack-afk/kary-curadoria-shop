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
    .maybeSingle();

  // maybeSingle: sem cupom flutuante ativo não é erro (.single() gerava 406 a cada visita)
  return NextResponse.json(data ?? null, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
