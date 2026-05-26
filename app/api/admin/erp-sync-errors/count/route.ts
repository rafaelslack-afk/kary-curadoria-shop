import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/erp-sync-errors/count
// Retorna a contagem de erros de sync ERP não resolvidos.
export async function GET() {
  try {
    const admin = createAdminClient();
    const { count, error } = await admin
      .from("erp_sync_errors")
      .select("id", { count: "exact", head: true })
      .eq("resolved", false);

    if (error) {
      console.error("[ERP Sync Errors] Erro ao contar erros:", error.message);
      return NextResponse.json({ count: 0 });
    }

    return NextResponse.json({ count: count ?? 0 });
  } catch (err) {
    console.error("[ERP Sync Errors] Exceção:", err);
    return NextResponse.json({ count: 0 });
  }
}
