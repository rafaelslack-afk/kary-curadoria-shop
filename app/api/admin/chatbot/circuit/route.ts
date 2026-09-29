import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { tryReopenAssistant } from "@/lib/chatbot/circuit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/admin/chatbot/circuit — "Tentar religar agora": faz a chamada de
// teste à API sem esperar o fim da pausa automática. Deu certo → religa.
export async function POST() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const circuit = await tryReopenAssistant(true);
  return NextResponse.json({ circuit }, { headers: { "Cache-Control": "no-store" } });
}
