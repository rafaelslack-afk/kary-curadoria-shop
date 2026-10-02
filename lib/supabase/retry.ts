// ── Retry curto para PGRST002 ────────────────────────────────────────────────
// PGRST002 = o PostgREST ainda não carregou o schema (ex.: reinício do
// PostgREST). No plano Pro o banco não pausa, então não há "acordar": no
// máximo 2 novas tentativas com espera curta e, depois, falha rápido — quem
// chama decide o fallback (cache ou mensagem amigável). Pior caso ~2 s de
// espera, em vez de segurar a requisição por mais de um minuto.
// ─────────────────────────────────────────────────────────────────────────────

const RETRYABLE_CODES = ["PGRST002"];
const RETRY_DELAYS_MS = [500, 1500];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Aceita qualquer função assíncrona cujo retorno contenha { error } opcional
export async function withRetry<T extends { error?: { code: string; message: string } | null }>(
  fn: () => PromiseLike<T>
): Promise<T> {
  let lastResult = await fn();

  for (let i = 0; i < RETRY_DELAYS_MS.length; i++) {
    const delay = RETRY_DELAYS_MS[i];
    const code = lastResult.error?.code ?? "";
    if (!RETRYABLE_CODES.includes(code)) break;
    console.warn(`[supabase/retry] ${code} — nova tentativa ${i + 1}/${RETRY_DELAYS_MS.length} em ${delay} ms`);
    await sleep(delay);
    lastResult = await fn();
  }

  if (lastResult.error && RETRYABLE_CODES.includes(lastResult.error.code)) {
    console.error(`[supabase/retry] ${lastResult.error.code} persistiu após ${RETRY_DELAYS_MS.length} novas tentativas.`);
  }

  return lastResult;
}
