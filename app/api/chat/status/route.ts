import { NextResponse } from "next/server";
import { getChatbotConfig } from "@/lib/chatbot/config";

// GET /api/chat/status — o widget só aparece quando o assistente está ligado.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { enabled, limits } = await getChatbotConfig();
  return NextResponse.json(
    { enabled, max_input_chars: limits.max_input_chars },
    { headers: { "Cache-Control": "no-store" } }
  );
}
