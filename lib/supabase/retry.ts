// ── Supabase wake-up retry helper ────────────────────────────────────────────
// O plano gratuito do Supabase pausa o banco após inatividade.
// Na primeira requisição após o pause, o PostgREST retorna PGRST002
// enquanto recarrega o schema — geralmente resolve em 1-3 segundos.
// ─────────────────────────────────────────────────────────────────────────────

const RETRYABLE_CODES = ["PGRST002"];
const MAX_ATTEMPTS = 9;   // 1 inicial + 8 retries = até 80s de espera
const RETRY_DELAY_MS = 10000; // 10s entre tentativas

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Aceita qualquer função assíncrona cujo retorno contenha { error } opcional
export async function withRetry<T extends { error?: { code: string; message: string } | null }>(
  fn: () => PromiseLike<T>
): Promise<T> {
  let lastResult = await fn();

  for (let attempt = 1; attempt < MAX_ATTEMPTS; attempt++) {
    const code = lastResult.error?.code ?? "";
    if (!RETRYABLE_CODES.includes(code)) break;

    console.warn(
      `[supabase/retry] PGRST002 — banco acordando (tentativa ${attempt}/${MAX_ATTEMPTS - 1}). ` +
        `Aguardando ${RETRY_DELAY_MS / 1000}s...`
    );
    await sleep(RETRY_DELAY_MS);
    lastResult = await fn();
  }

  if (lastResult.error && RETRYABLE_CODES.includes(lastResult.error.code)) {
    console.error("[supabase/retry] Máximo de tentativas atingido. Banco não respondeu.");
  }

  return lastResult;
}
