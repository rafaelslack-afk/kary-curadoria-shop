import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildConsultoraUrl, type ConsultoraSummary } from "@/lib/chatbot/whatsapp";
import { buildWhatsAppUrl } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SESSION_RE = /^[A-Za-z0-9-]{8,100}$/;

interface ToolCall {
  name?: unknown;
  input?: Record<string, unknown>;
}

interface ToolsUsed {
  tools?: ToolCall[];
  shown?: unknown;
  interesse?: unknown;
}

function text(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function slugs(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : [];
}

// POST /api/chat/whatsapp-link { conversation_id, session_id }
// Link do "Falar com a consultora": resumo da conversa montado a partir do
// que as ferramentas registraram (buscas, encaminhamento e peças exibidas),
// sem chamar o modelo. Nada vem do texto livre do modelo.
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const conversationId = text(body.conversation_id);
  const sessionId = text(body.session_id);
  const generic = NextResponse.json({ url: buildWhatsAppUrl("Olá! Vim pelo assistente do site.") });
  if (!UUID_RE.test(conversationId) || !SESSION_RE.test(sessionId)) return generic;

  const admin = createAdminClient();
  const { data: conversation } = await admin
    .from("chat_conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("session_id", sessionId)
    .maybeSingle();
  if (!conversation) return generic;

  const { data: rows } = await admin
    .from("chat_messages")
    .select("tools_used")
    .eq("conversation_id", conversationId)
    .eq("role", "assistant")
    .order("created_at", { ascending: true });

  // Em ordem cronológica: o valor mais recente de cada campo vence
  const summary: ConsultoraSummary = {};
  let pieceSlugs: string[] = [];
  for (const row of rows ?? []) {
    const used = (row.tools_used ?? {}) as ToolsUsed;
    for (const call of used.tools ?? []) {
      const input = call.input ?? {};
      if (call.name === "buscar_produtos") {
        const termo = text(input.termo);
        // Busca só por referência não descreve o que ela procura
        if (termo && !/^[a-z]{1,4}[\s-]?\d{1,4}$/i.test(termo)) summary.procura = termo;
        if (text(input.cor)) summary.cor = text(input.cor);
        if (text(input.tamanho)) summary.tamanho = text(input.tamanho);
      } else if (call.name === "encaminhar_whatsapp") {
        for (const key of ["procura", "tamanho", "cor", "ocasiao"] as const) {
          if (text(input[key])) summary[key] = text(input[key]);
        }
      }
    }
    const interesse = slugs(used.interesse);
    const shown = slugs(used.shown);
    if (interesse.length > 0) pieceSlugs = interesse;
    else if (shown.length > 0) pieceSlugs = shown;
  }

  pieceSlugs = pieceSlugs.slice(0, 3);
  if (pieceSlugs.length > 0) {
    const { data: products } = await admin
      .from("products")
      .select("name, slug, sku_base")
      .in("slug", pieceSlugs)
      .eq("active", true);
    summary.pieces = pieceSlugs
      .map((slug) => (products ?? []).find((p) => p.slug === slug))
      .filter((p): p is { name: string; slug: string; sku_base: string | null } => !!p);
  }

  return NextResponse.json(
    { url: buildConsultoraUrl(summary).url },
    { headers: { "Cache-Control": "no-store" } }
  );
}
