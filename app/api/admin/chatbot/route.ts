import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getChatbotConfig } from "@/lib/chatbot/config";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Preço Claude Haiku 4.5 (US$ por milhão de tokens)
const USD_PER_MTOK_INPUT = 1;
const USD_PER_MTOK_OUTPUT = 5;

// São Paulo não tem horário de verão desde 2019: UTC-3 fixo
const SP_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function spStartOfDay(daysAgo = 0): Date {
  const sp = new Date(Date.now() - SP_OFFSET_MS);
  sp.setUTCHours(0, 0, 0, 0);
  return new Date(sp.getTime() + SP_OFFSET_MS - daysAgo * DAY_MS);
}

function spStartOfMonth(): Date {
  const sp = new Date(Date.now() - SP_OFFSET_MS);
  sp.setUTCDate(1);
  sp.setUTCHours(0, 0, 0, 0);
  return new Date(sp.getTime() + SP_OFFSET_MS);
}

// GET /api/admin/chatbot — status, resumo e conversas recentes
export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const admin = createAdminClient();
  const { enabled } = await getChatbotConfig();

  const today = spStartOfDay(0);
  const d7 = spStartOfDay(6);
  const d30 = spStartOfDay(29);
  const monthStart = spStartOfMonth();
  const since = d30 < monthStart ? d30 : monthStart;

  const { data: rows, error } = await admin
    .from("chat_conversations")
    .select("id, created_at, handed_off_whatsapp, input_tokens, output_tokens")
    .gte("created_at", since.toISOString());
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const convs = rows ?? [];
  const inRange = (from: Date) => convs.filter((c) => new Date(c.created_at) >= from);
  const last30 = inRange(d30);
  const month = inRange(monthStart);
  const monthInput = month.reduce((s, c) => s + (c.input_tokens ?? 0), 0);
  const monthOutput = month.reduce((s, c) => s + (c.output_tokens ?? 0), 0);

  const { data: recent } = await admin
    .from("chat_conversations")
    .select("id, page_origin, message_count, handed_off_whatsapp, input_tokens, output_tokens, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(50);

  // Prévia: primeira mensagem da cliente em cada conversa
  const ids = (recent ?? []).map((c) => c.id);
  const previews = new Map<string, string>();
  if (ids.length > 0) {
    const { data: firstMsgs } = await admin
      .from("chat_messages")
      .select("conversation_id, content, created_at")
      .in("conversation_id", ids)
      .eq("role", "user")
      .order("created_at", { ascending: true });
    for (const m of firstMsgs ?? []) {
      if (!previews.has(m.conversation_id)) previews.set(m.conversation_id, m.content.slice(0, 140));
    }
  }

  return NextResponse.json(
    {
      enabled,
      stats: {
        today: inRange(today).length,
        last7: inRange(d7).length,
        last30: last30.length,
        handoffPct30:
          last30.length > 0
            ? Math.round((last30.filter((c) => c.handed_off_whatsapp).length / last30.length) * 1000) / 10
            : 0,
        monthInputTokens: monthInput,
        monthOutputTokens: monthOutput,
        monthCostUsd:
          (monthInput / 1_000_000) * USD_PER_MTOK_INPUT + (monthOutput / 1_000_000) * USD_PER_MTOK_OUTPUT,
      },
      conversations: (recent ?? []).map((c) => ({ ...c, preview: previews.get(c.id) ?? "" })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

// PUT /api/admin/chatbot — body: { enabled: boolean }
export async function PUT(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  let body: { enabled?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "Campo 'enabled' (boolean) é obrigatório." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("system_config").upsert({
    key: "chatbot_enabled",
    value: body.enabled ? "true" : "false",
    updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ enabled: body.enabled });
}
