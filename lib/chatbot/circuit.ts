// Desligamento automático do assistente (circuit breaker) quando a API da
// Anthropic falha. Server-only (service role).
//
// - Cada falha da chamada à API é gravada em chat_api_failures.
// - FAILURE_THRESHOLD falhas em FAILURE_WINDOW_MS → circuito aberto por
//   OPEN_MS: o widget some e o /api/chat responde sem chamar a API.
// - Passado esse tempo (half-open), uma única chamada de teste é liberada:
//   deu certo → circuito fechado; falhou → aberto por mais OPEN_MS.
// - Independente do chatbot_enabled manual, que sempre tem prioridade.
//
// Os logs e a tabela guardam só o tipo do erro: nada de conteúdo de
// mensagens, chave ou dados de clientes.
import Anthropic from "@anthropic-ai/sdk";
import { createNoStoreAdminClient } from "@/lib/supabase/admin-no-store";
import { CHAT_MODEL } from "@/lib/chatbot/config";

function envMs(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// Tempos ajustáveis por variável de ambiente (usado nos testes locais)
const FAILURE_WINDOW_MS = envMs("CHAT_CIRCUIT_WINDOW_MS", 5 * 60 * 1000);
const OPEN_MS = envMs("CHAT_CIRCUIT_OPEN_MS", 15 * 60 * 1000);
const FAILURE_THRESHOLD = 3;
// Reserva da chamada de teste: evita que duas instâncias testem ao mesmo tempo
const PROBE_LEASE_MS = 60 * 1000;

export type CircuitPhase = "closed" | "open" | "half_open";

interface CircuitRow {
  state: "closed" | "open";
  opened_at: string | null;
  open_until: string | null;
  reason: string | null;
  failures: number | null;
  probe_until: string | null;
  closed_at: string | null;
}

export interface CircuitStatus {
  phase: CircuitPhase;
  opened_at: string | null;
  open_until: string | null;
  reason: string | null;
  failures: number | null;
}

// Tipo do erro para o registro. null → não é falha da API da Anthropic
// (ex.: erro de banco nas ferramentas), não conta para o circuito.
export function classifyApiError(err: unknown): string | null {
  if (err instanceof Anthropic.APIConnectionTimeoutError) return "timeout";
  if (err instanceof Anthropic.APIConnectionError) return "erro_de_conexao";
  if (err instanceof Anthropic.APIError) {
    const body = err.error as { error?: { type?: unknown } } | undefined;
    const type = typeof body?.error?.type === "string" ? body.error.type : null;
    return `http_${err.status ?? "sem_status"}${type ? `_${type}` : ""}`;
  }
  // Ex.: chave ausente no ambiente — configuração, conta como falha
  if (err instanceof Anthropic.AnthropicError) return "erro_de_configuracao";
  return null;
}

function toStatus(row: CircuitRow | null, now = Date.now()): CircuitStatus {
  if (!row || row.state !== "open") {
    return { phase: "closed", opened_at: null, open_until: null, reason: null, failures: null };
  }
  const openUntil = row.open_until ? new Date(row.open_until).getTime() : 0;
  return {
    phase: openUntil > now ? "open" : "half_open",
    opened_at: row.opened_at,
    open_until: row.open_until,
    reason: row.reason,
    failures: row.failures,
  };
}

async function readRow(): Promise<CircuitRow | null> {
  const db = createNoStoreAdminClient();
  const { data } = await db
    .from("chat_circuit")
    .select("state, opened_at, open_until, reason, failures, probe_until, closed_at")
    .eq("id", 1)
    .maybeSingle();
  return (data as CircuitRow | null) ?? null;
}

export async function getCircuitStatus(): Promise<CircuitStatus> {
  try {
    return toStatus(await readRow());
  } catch {
    // Sem conseguir ler o estado, não bloqueia o assistente por isso
    return toStatus(null);
  }
}

// Registra uma falha e abre o circuito ao atingir o limite na janela
export async function recordApiFailure(errorType: string): Promise<void> {
  const db = createNoStoreAdminClient();
  const now = Date.now();
  await db.from("chat_api_failures").insert({ error_type: errorType });

  const row = await readRow();
  if (!row || row.state === "open") return;

  // Falhas anteriores ao último fechamento não contam
  const windowStart = Math.max(now - FAILURE_WINDOW_MS, row.closed_at ? new Date(row.closed_at).getTime() : 0);
  const { count } = await db
    .from("chat_api_failures")
    .select("id", { count: "exact", head: true })
    .gt("created_at", new Date(windowStart).toISOString());
  const failures = count ?? 0;
  if (failures < FAILURE_THRESHOLD) return;

  // Só a instância que efetivamente mudar de "closed" para "open" registra o log
  const { data: opened } = await db
    .from("chat_circuit")
    .update({
      state: "open",
      opened_at: new Date(now).toISOString(),
      open_until: new Date(now + OPEN_MS).toISOString(),
      reason: errorType,
      failures,
      probe_until: null,
      updated_at: new Date(now).toISOString(),
    })
    .eq("id", 1)
    .eq("state", "closed")
    .select("id");
  if (opened && opened.length > 0) {
    console.warn(`[chat] circuito aberto tipo=${errorType} falhas=${failures}`);
  }
}

// Reserva a chamada de teste (half-open). `force`: botão "tentar religar agora"
// do admin, que não espera o fim dos 15 minutos.
export async function claimProbe(force = false): Promise<boolean> {
  const db = createNoStoreAdminClient();
  const nowIso = new Date().toISOString();
  let query = db
    .from("chat_circuit")
    .update({ probe_until: new Date(Date.now() + PROBE_LEASE_MS).toISOString(), updated_at: nowIso })
    .eq("id", 1)
    .eq("state", "open")
    .or(`probe_until.is.null,probe_until.lt.${nowIso}`);
  if (!force) query = query.lte("open_until", nowIso);
  const { data } = await query.select("id");
  return !!data && data.length > 0;
}

export async function closeCircuit(): Promise<void> {
  const db = createNoStoreAdminClient();
  const nowIso = new Date().toISOString();
  const { data } = await db
    .from("chat_circuit")
    .update({
      state: "closed",
      opened_at: null,
      open_until: null,
      reason: null,
      failures: null,
      probe_until: null,
      closed_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", 1)
    .eq("state", "open")
    .select("id");
  if (data && data.length > 0) console.warn("[chat] circuito fechado");
}

// Chamada de teste falhou: registra e reabre por mais OPEN_MS
export async function reopenCircuit(errorType: string): Promise<void> {
  const db = createNoStoreAdminClient();
  const now = Date.now();
  await db.from("chat_api_failures").insert({ error_type: errorType });
  const row = await readRow();
  const failures = (row?.failures ?? 0) + 1;
  await db
    .from("chat_circuit")
    .update({
      state: "open",
      opened_at: row?.opened_at ?? new Date(now).toISOString(),
      open_until: new Date(now + OPEN_MS).toISOString(),
      reason: errorType,
      failures,
      probe_until: null,
      updated_at: new Date(now).toISOString(),
    })
    .eq("id", 1);
  console.warn(`[chat] circuito aberto tipo=${errorType} falhas=${failures}`);
}

// Chamada mínima à API (1 token de saída) para testar se ela voltou
async function pingApi(): Promise<string | null> {
  try {
    const client = new Anthropic({ timeout: 10_000, maxRetries: 0 });
    await client.messages.create({
      model: CHAT_MODEL,
      max_tokens: 1,
      messages: [{ role: "user", content: "ping" }],
    });
    return null;
  } catch (err) {
    return classifyApiError(err) ?? "erro_desconhecido";
  }
}

// Half-open sem cliente no chat (o widget está oculto): quem pedir o status
// primeiro faz a chamada de teste. Retorna o estado depois do teste.
export async function tryReopenAssistant(force = false): Promise<CircuitStatus> {
  const status = await getCircuitStatus();
  if (status.phase === "closed") return status;
  if (!force && status.phase === "open") return status;
  if (!(await claimProbe(force))) return getCircuitStatus();

  const failure = await pingApi();
  if (failure) await reopenCircuit(failure);
  else await closeCircuit();
  return getCircuitStatus();
}
