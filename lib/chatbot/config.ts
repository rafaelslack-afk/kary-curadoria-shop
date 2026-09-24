// Configuração do assistente virtual lida de system_config, sem cache.
// Server-only (usa service role).
import { createNoStoreAdminClient } from "@/lib/supabase/admin-no-store";

export interface ChatbotLimits {
  max_messages_per_conversation: number;
  max_conversations_per_ip_day: number;
  max_input_chars: number;
}

const DEFAULT_LIMITS: ChatbotLimits = {
  max_messages_per_conversation: 20,
  max_conversations_per_ip_day: 10,
  max_input_chars: 500,
};

export async function getChatbotConfig(): Promise<{ enabled: boolean; limits: ChatbotLimits }> {
  const admin = createNoStoreAdminClient();
  const { data, error } = await admin
    .from("system_config")
    .select("key, value")
    .in("key", ["chatbot_enabled", "chatbot_limits"]);

  // Falha de leitura → desligado (nunca chamar a API paga sem conseguir ler os limites)
  if (error || !data) return { enabled: false, limits: DEFAULT_LIMITS };

  const enabled = data.find((r) => r.key === "chatbot_enabled")?.value === "true";

  const limits = { ...DEFAULT_LIMITS };
  const rawLimits = data.find((r) => r.key === "chatbot_limits")?.value;
  if (rawLimits) {
    try {
      const parsed = JSON.parse(rawLimits) as Partial<Record<keyof ChatbotLimits, unknown>>;
      for (const key of Object.keys(DEFAULT_LIMITS) as (keyof ChatbotLimits)[]) {
        const n = Number(parsed[key]);
        if (Number.isFinite(n) && n > 0) limits[key] = Math.floor(n);
      }
    } catch {
      /* JSON inválido → mantém defaults */
    }
  }

  return { enabled, limits };
}
