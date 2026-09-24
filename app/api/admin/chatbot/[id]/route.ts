import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/chatbot/[id] — histórico completo de uma conversa
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const admin = createAdminClient();
  const { data: conversation } = await admin
    .from("chat_conversations")
    .select("id, page_origin, message_count, handed_off_whatsapp, input_tokens, output_tokens, created_at, updated_at")
    .eq("id", params.id)
    .maybeSingle();
  if (!conversation) return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });

  const { data: messages } = await admin
    .from("chat_messages")
    .select("id, role, content, tools_used, created_at")
    .eq("conversation_id", params.id)
    .order("created_at", { ascending: true });

  return NextResponse.json(
    { conversation, messages: messages ?? [] },
    { headers: { "Cache-Control": "no-store" } }
  );
}
