import { createHmac } from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getChatbotConfig } from "@/lib/chatbot/config";
import { CHAT_SYSTEM_PROMPT } from "@/lib/chatbot/system-prompt";
import { CHAT_TOOLS, createToolExecutor, type ChatProductCard } from "@/lib/chatbot/tools";
import { buildWhatsAppUrl } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 1024;
const MAX_TOOL_ROUNDS = 6;
const MAX_CARDS = 6;
const HISTORY_LIMIT = 40;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SESSION_RE = /^[A-Za-z0-9-]{8,100}$/;

const MSG = {
  disabled:
    "Nosso assistente está indisponível no momento. Fale com a nossa consultora pelo WhatsApp que ela te ajuda!",
  conversationLimit:
    "Chegamos ao limite desta conversa com o assistente. Para continuar, fale com a nossa consultora pelo WhatsApp.",
  ipLimit:
    "Você já conversou bastante com o assistente hoje. Para continuar, fale com a nossa consultora pelo WhatsApp.",
  error:
    "Tive um problema para responder agora. Você pode tentar de novo em instantes ou falar com a nossa consultora pelo WhatsApp.",
  empty: "Não consegui formular uma resposta. Pode reformular a pergunta, ou falar com a nossa consultora pelo WhatsApp?",
};

// Prompt caching: system e tools são fixos entre requisições.
const SYSTEM_BLOCKS: Anthropic.TextBlockParam[] = [
  { type: "text", text: CHAT_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
];
const TOOLS: Anthropic.Tool[] = CHAT_TOOLS.map((tool, i) =>
  i === CHAT_TOOLS.length - 1 ? { ...tool, cache_control: { type: "ephemeral" } } : tool
);

let anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  // Lê ANTHROPIC_API_KEY do ambiente (server-only). Nunca logar a chave.
  if (!anthropic) anthropic = new Anthropic({ timeout: 25_000, maxRetries: 1 });
  return anthropic;
}

function friendly(reply: string, conversationId: string | null, status = 200) {
  return NextResponse.json(
    { conversation_id: conversationId, reply, products: [], whatsapp_url: buildWhatsAppUrl() },
    { status }
  );
}

// IP nunca é gravado em texto puro: HMAC com um segredo do servidor, para
// que o hash não possa ser revertido por força bruta sobre o espaço de IPv4.
function hashIp(request: NextRequest): string | null {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "";
  if (!ip) return null;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "kvo-chat";
  return createHmac("sha256", secret).update(`chat-ip:${ip}`).digest("hex");
}

// Remove URLs absolutas e markdown básico do texto gerado: links só chegam à
// cliente pelos cards/botão montados a partir dos resultados das ferramentas.
function sanitizeReply(text: string): string {
  return text
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\*\*/g, "")
    .replace(/^#+\s*/gm, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

// Resumo seguro de uma falha: ex. "anthropic_api_error status=401
// type=authentication_error request_id=req_... message=...". Nunca inclui a
// chave nem o texto das mensagens da cliente.
function describeError(err: unknown): string {
  // Rótulos fixos (constructor.name pode vir minificado no build)
  if (err instanceof Anthropic.APIConnectionTimeoutError) return "anthropic_timeout";
  if (err instanceof Anthropic.APIConnectionError) return "anthropic_connection_error";
  if (err instanceof Anthropic.APIError) {
    const body = err.error as { error?: { type?: unknown; message?: unknown } } | undefined;
    const type = typeof body?.error?.type === "string" ? body.error.type : "unknown";
    // A mensagem da API descreve o problema da requisição (ex.: header ou
    // campo inválido), não o conteúdo da conversa; truncada por segurança.
    const apiMessage =
      typeof body?.error?.message === "string" ? body.error.message.slice(0, 300) : "none";
    return `anthropic_api_error status=${err.status ?? "none"} type=${type} request_id=${err.requestID ?? "none"} message="${apiMessage}"`;
  }
  if (err instanceof Anthropic.AnthropicError) {
    // Ex.: chave ausente no ambiente (lançado antes de qualquer chamada)
    return `anthropic_client_error missing_api_key=${!process.env.ANTHROPIC_API_KEY}`;
  }
  return `non_anthropic_error ${err instanceof Error ? err.name : typeof err}`;
}

interface TurnUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
}

async function runAssistant(
  history: Anthropic.MessageParam[],
  userMessage: string,
  conversationId: string
) {
  const client = getAnthropic();
  const runTool = createToolExecutor(conversationId);
  const messages: Anthropic.MessageParam[] = [...history, { role: "user", content: userMessage }];

  const toolsUsed: { name: string; input: unknown }[] = [];
  // Cards vêm só de mostrar_produtos (a última chamada da rodada vale)
  let cards: ChatProductCard[] = [];
  let whatsappUrl: string | undefined;
  const usage: TurnUsage = {
    input_tokens: 0,
    output_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
  };

  for (let round = 0; ; round++) {
    // Limite de segurança: depois de MAX_TOOL_ROUNDS rodadas de ferramentas,
    // força uma resposta final em texto.
    const forceText = round >= MAX_TOOL_ROUNDS;
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_BLOCKS,
      tools: TOOLS,
      messages,
      ...(forceText ? { tool_choice: { type: "none" as const } } : {}),
    });

    usage.input_tokens += response.usage.input_tokens;
    usage.output_tokens += response.usage.output_tokens;
    usage.cache_read_input_tokens += response.usage.cache_read_input_tokens ?? 0;
    usage.cache_creation_input_tokens += response.usage.cache_creation_input_tokens ?? 0;

    const responseText = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    if (response.stop_reason === "tool_use" && !forceText) {
      messages.push({ role: "assistant", content: response.content });

      const toolUses = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );
      // Em sequência, na ordem pedida: mostrar_produtos depende do que as
      // buscas anteriores da mesma mensagem retornaram.
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        toolsUsed.push({ name: tu.name, input: tu.input });
        const outcome = await runTool(tu.name, tu.input);
        if (outcome.cards) cards = outcome.cards;
        if (outcome.whatsappUrl) whatsappUrl = outcome.whatsappUrl;
        results.push({
          type: "tool_result" as const,
          tool_use_id: tu.id,
          content: JSON.stringify(outcome.result),
          ...(outcome.isError ? { is_error: true } : {}),
        });
      }

      // Resposta já escrita e só faltava exibir os cards: encerra sem outra
      // chamada ao modelo.
      const reply = sanitizeReply(responseText);
      if (reply && toolUses.every((tu) => tu.name === "mostrar_produtos")) {
        return { reply, products: cards.slice(0, MAX_CARDS), whatsappUrl, toolsUsed, usage };
      }

      // Todos os tool_result em uma única mensagem de usuário
      messages.push({ role: "user", content: results });
      continue;
    }

    const reply =
      response.stop_reason === "refusal" ? MSG.empty : sanitizeReply(responseText) || MSG.empty;

    return {
      reply,
      products: cards.slice(0, MAX_CARDS),
      whatsappUrl,
      toolsUsed,
      usage,
    };
  }
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const sessionId = typeof body.session_id === "string" ? body.session_id.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const requestedConversationId =
    typeof body.conversation_id === "string" && UUID_RE.test(body.conversation_id)
      ? body.conversation_id
      : null;
  const page = typeof body.page === "string" ? body.page.slice(0, 300) : null;

  if (!SESSION_RE.test(sessionId)) {
    return NextResponse.json({ error: "invalid_session" }, { status: 400 });
  }

  // 1. Assistente ligado?
  const { enabled, limits } = await getChatbotConfig();
  if (!enabled) return friendly(MSG.disabled, requestedConversationId);

  // 2. Validação da mensagem
  if (!message) return NextResponse.json({ error: "empty_message" }, { status: 400 });
  if (message.length > limits.max_input_chars) {
    return NextResponse.json(
      {
        error: "message_too_long",
        reply: `Sua mensagem ficou um pouco longa. Pode resumir em até ${limits.max_input_chars} caracteres?`,
      },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // 3/4. Conversa existente (precisa pertencer à mesma sessão) ou nova
  let conversation: { id: string; message_count: number; input_tokens: number; output_tokens: number } | null =
    null;
  if (requestedConversationId) {
    const { data } = await admin
      .from("chat_conversations")
      .select("id, message_count, input_tokens, output_tokens")
      .eq("id", requestedConversationId)
      .eq("session_id", sessionId)
      .maybeSingle();
    conversation = data;
  }

  if (!conversation) {
    const ipHash = hashIp(request);
    if (ipHash) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await admin
        .from("chat_conversations")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash)
        .gte("created_at", since);
      if ((count ?? 0) >= limits.max_conversations_per_ip_day) return friendly(MSG.ipLimit, null);
    }

    const { data: created, error } = await admin
      .from("chat_conversations")
      .insert({ session_id: sessionId, ip_hash: ipHash, page_origin: page })
      .select("id, message_count, input_tokens, output_tokens")
      .single();
    if (error || !created) return friendly(MSG.error, null);
    conversation = created;
  }

  if (conversation.message_count >= limits.max_messages_per_conversation) {
    return friendly(MSG.conversationLimit, conversation.id);
  }

  // Histórico vem do banco — nunca do client
  const { data: historyRows } = await admin
    .from("chat_messages")
    .select("role, content")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true })
    .limit(HISTORY_LIMIT);
  const history: Anthropic.MessageParam[] = (historyRows ?? [])
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  // 5/6. Modelo + loop de ferramentas
  let outcome: Awaited<ReturnType<typeof runAssistant>> | null = null;
  try {
    outcome = await runAssistant(history, message, conversation.id);
  } catch (err) {
    // Nunca expor detalhe técnico ao client nem logar a chave ou o conteúdo
    // das mensagens: só classe, status HTTP e tipo de erro da Anthropic.
    console.error("[chat] falha ao gerar resposta:", describeError(err));
  }

  const reply = outcome?.reply ?? MSG.error;
  const now = new Date().toISOString();

  // 7. Persistência
  await admin.from("chat_messages").insert([
    { conversation_id: conversation.id, role: "user", content: message },
    {
      conversation_id: conversation.id,
      role: "assistant",
      content: reply,
      tools_used: outcome
        ? { tools: outcome.toolsUsed, usage: outcome.usage }
        : { error: true },
    },
  ]);

  const totalInput = outcome
    ? outcome.usage.input_tokens +
      outcome.usage.cache_read_input_tokens +
      outcome.usage.cache_creation_input_tokens
    : 0;
  await admin
    .from("chat_conversations")
    .update({
      message_count: conversation.message_count + 1,
      input_tokens: conversation.input_tokens + totalInput,
      output_tokens: conversation.output_tokens + (outcome?.usage.output_tokens ?? 0),
      updated_at: now,
    })
    .eq("id", conversation.id);

  // 8. Resposta — cards e link montados a partir dos resultados das ferramentas
  return NextResponse.json({
    conversation_id: conversation.id,
    reply,
    products: outcome?.products ?? [],
    whatsapp_url: outcome ? outcome.whatsappUrl : buildWhatsAppUrl(),
  });
}
