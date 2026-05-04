// ── Supabase wake-up retry helper ────────────────────────────────────────────
// O plano gratuito do Supabase pausa o banco após inatividade.
// Na primeira requisição após o pause, o PostgREST pode retornar PGRST002
// enquanto recarrega o schema — geralmente resolve em 1-3 segundos.
// Também pode ocorrer UND_ERR_SOCKET quando o banco fecha a conexão TCP
// antes de responder (o retry captura ambos os casos).
// ─────────────────────────────────────────────────────────────────────────────

const RETRYABLE_CODES = ["PGRST002"];
const RETRYABLE_SOCKET_CODES = ["UND_ERR_SOCKET", "ECONNRESET", "ECONNREFUSED", "ETIMEDOUT"];
const MAX_ATTEMPTS = 9;   // 1 inicial + 8 retries = até 80s de espera
const RETRY_DELAY_MS = 10_000; // 10s entre tentativas

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function isSocketError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const cause = (err as { cause?: { code?: string } }).cause;
  return !!(cause?.code && RETRYABLE_SOCKET_CODES.includes(cause.code));
}

// Aceita qualquer função assíncrona cujo retorno contenha { error } opcional
export async function withRetry<T extends { error?: { code: string; message: string } | null }>(
  fn: () => PromiseLike<T>
): Promise<T> {
  let lastResult: T | undefined;
  let lastException: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_DELAY_MS);
    }

    try {
      lastResult = await fn();
      lastException = undefined;
    } catch (err) {
      if (isSocketError(err)) {
        lastException = err;
        console.warn(
          `[supabase/retry] Erro de socket (UND_ERR_SOCKET) — banco acordando? ` +
          `(tentativa ${attempt + 1}/${MAX_ATTEMPTS}). Aguardando ${RETRY_DELAY_MS / 1000}s...`
        );
        continue;
      }
      throw err;
    }

    const code = lastResult.error?.code ?? "";
    if (!RETRYABLE_CODES.includes(code)) return lastResult;

    console.warn(
      `[supabase/retry] PGRST002 — banco acordando (tentativa ${attempt + 1}/${MAX_ATTEMPTS}). ` +
        `Aguardando ${RETRY_DELAY_MS / 1000}s...`
    );
  }

  if (lastException) {
    console.error("[supabase/retry] Máximo de tentativas atingido por erros de rede.");
    throw lastException;
  }

  console.error("[supabase/retry] Máximo de tentativas atingido. Banco não respondeu.");
  return lastResult!;
}
