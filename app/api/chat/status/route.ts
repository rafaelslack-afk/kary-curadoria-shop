import { NextResponse } from "next/server";
import { getChatbotConfig } from "@/lib/chatbot/config";
import { getCircuitStatus, tryReopenAssistant } from "@/lib/chatbot/circuit";

// GET /api/chat/status — o widget só aparece quando o assistente está ligado
// no admin E o desligamento automático (falhas da API) não está ativo.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { enabled, limits } = await getChatbotConfig();

  let available = enabled;
  // Desligado no admin tem prioridade: nem consulta o circuito
  if (enabled) {
    let circuit = await getCircuitStatus();
    // Passado o tempo de pausa, a primeira visita dispara a chamada de teste
    if (circuit.phase === "half_open") circuit = await tryReopenAssistant();
    available = circuit.phase === "closed";
  }

  return NextResponse.json(
    { enabled: available, max_input_chars: limits.max_input_chars },
    { headers: { "Cache-Control": "no-store" } }
  );
}
