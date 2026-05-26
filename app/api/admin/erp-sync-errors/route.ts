import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/erp-sync-errors?status=pending|resolved|all&search=xxx&limit=50&offset=0
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status  = searchParams.get("status") ?? "pending";
    const search  = searchParams.get("search") ?? "";
    const limit   = parseInt(searchParams.get("limit")  ?? "50");
    const offset  = parseInt(searchParams.get("offset") ?? "0");

    const admin = createAdminClient();
    let query = admin
      .from("erp_sync_errors")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status === "pending")  query = query.eq("resolved", false);
    if (status === "resolved") query = query.eq("resolved", true);

    if (search) {
      query = query.or(
        `product_code.ilike.%${search}%,color_erp.ilike.%${search}%,sku_tentado.ilike.%${search}%`
      );
    }

    const { data, count, error } = await query;

    if (error) {
      console.error("[ERP Sync Errors] Erro ao listar:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [], total: count ?? 0 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH /api/admin/erp-sync-errors
// Body: { ids: string[], resolved_by?: string, notes?: string }
// Marca os erros selecionados como resolvidos.
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json() as {
      ids: string[];
      resolved_by?: string;
      notes?: string;
    };

    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json({ error: "ids[] é obrigatório." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("erp_sync_errors")
      .update({
        resolved:    true,
        resolved_at: new Date().toISOString(),
        resolved_by: body.resolved_by ?? "admin",
        notes:       body.notes ?? null,
      })
      .in("id", body.ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, updated: body.ids.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
