import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/erp-sync-status
// Retorna o timestamp da última sincronização do ERP.
export async function GET() {
  const admin = createAdminClient();

  const { data } = await admin
    .from("system_config")
    .select("value, updated_at")
    .eq("key", "last_erp_sync")
    .single();

  if (!data) {
    return NextResponse.json({ lastSync: null, hoursSince: null });
  }

  const lastSync = new Date(data.value);
  const hoursSince = (Date.now() - lastSync.getTime()) / 1000 / 3600;

  return NextResponse.json({
    lastSync: data.value,
    hoursSince: Math.floor(hoursSince * 10) / 10, // 1 casa decimal
  });
}
