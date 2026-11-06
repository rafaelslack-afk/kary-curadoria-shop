import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { notifyErpNewSale } from "@/lib/erp/notify-sale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MESSAGES: Record<string, string> = {
  sent: "Venda enviada ao ERP.",
  already_notified: "Este pedido já tinha sido enviado ao ERP.",
  in_progress: "Já existe um envio em andamento para este pedido. Aguarde um minuto.",
  skipped: "Nenhum item deste pedido notifica o ERP (notifica_erp_venda=false).",
  not_paid: "O pedido não está pago.",
  not_found: "Pedido não encontrado.",
  not_configured: "ERP_BASE_URL ou ERP_WEBHOOK_SECRET não configurados.",
  failed: "O ERP não confirmou o recebimento após as tentativas.",
};

// POST /api/admin/orders/[id]/erp-resend — botão "Reenviar ao ERP".
// Só envia se orders.erp_notified_at ainda estiver vazio (sem duplicar venda).
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  if (!params.id) {
    return NextResponse.json({ error: "ID do pedido nao informado." }, { status: 400 });
  }

  const result = await notifyErpNewSale(params.id, "admin-resend");
  const ok = result.status === "sent" || result.status === "already_notified" || result.status === "skipped";

  return NextResponse.json(
    { ...result, ok, message: MESSAGES[result.status] ?? result.status },
    { status: ok ? 200 : result.status === "not_found" ? 404 : result.status === "in_progress" ? 409 : 502 }
  );
}
