import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/sidebar-counts — contadores do menu lateral numa chamada só
// (uma validação de sessão em vez de uma por contador).
// - abandonos: checkouts abandonados não recuperados nos últimos 7 dias
// - erpSyncErrors: erros de sync ERP não resolvidos
export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const admin = createAdminClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [abandonos, erpErrors] = await Promise.all([
    admin
      .from("abandoned_checkouts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since)
      .eq("recovered", false),
    admin.from("erp_sync_errors").select("id", { count: "exact", head: true }).eq("resolved", false),
  ]);

  return NextResponse.json(
    {
      abandonos: abandonos.error ? null : abandonos.count ?? 0,
      erpSyncErrors: erpErrors.error ? null : erpErrors.count ?? 0,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
