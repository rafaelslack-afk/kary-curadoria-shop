// Configurações do atacado em system_config, lidas sem cache (mudanças no
// admin valem na hora, sem deploy). Server-only: usa service role.
import { randomBytes } from "crypto";
import { createNoStoreAdminClient } from "@/lib/supabase/admin-no-store";
import { getPlusSizeMarkups } from "@/lib/pricing-server";
import type { DescontosAtacado, RegraPrecoAtacado } from "@/lib/atacado/pricing";

export interface AvisoNovidades {
  ativo: boolean;
  texto: string;
}

export interface AtacadoConfig {
  descontos: DescontosAtacado;
  minimoPecas: number;
  token: string | null; // null → nenhum link válido (configuração ausente)
  whatsapp: string;
  aviso: AvisoNovidades;
}

export const AVISO_MAX_CHARS = 250;

const DEFAULTS: Omit<AtacadoConfig, "token"> = {
  descontos: { pix: 20, credit_card: 10 },
  minimoPecas: 6,
  whatsapp: "5511940224088",
  aviso: {
    ativo: true,
    texto:
      "Lançamentos e novidades: algumas peças novas ainda não estão neste catálogo. Fale com a gente no WhatsApp para receber fotos, vídeos e informações.",
  },
};

const KEYS = {
  descontos: "atacado_descontos",
  minimoPecas: "atacado_minimo_pecas",
  token: "atacado_token",
  whatsapp: "atacado_whatsapp",
  aviso: "atacado_aviso_novidades",
} as const;

function parseJson<T>(raw: string | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function pct(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : fallback;
}

export async function getAtacadoConfig(): Promise<AtacadoConfig> {
  const db = createNoStoreAdminClient();
  const { data } = await db.from("system_config").select("key, value").in("key", Object.values(KEYS));
  const get = (key: string) => data?.find((r) => r.key === key)?.value as string | undefined;

  const descontos = parseJson<Partial<DescontosAtacado>>(get(KEYS.descontos));
  const minimo = Number(get(KEYS.minimoPecas));
  const aviso = parseJson<Partial<AvisoNovidades>>(get(KEYS.aviso));
  const token = get(KEYS.token)?.trim();

  return {
    descontos: {
      pix: pct(descontos?.pix, DEFAULTS.descontos.pix),
      credit_card: pct(descontos?.credit_card, DEFAULTS.descontos.credit_card),
    },
    minimoPecas: Number.isInteger(minimo) && minimo > 0 ? minimo : DEFAULTS.minimoPecas,
    // Token curto demais não vale: sem configuração, ninguém entra
    token: token && token.length >= 16 ? token : null,
    whatsapp: (get(KEYS.whatsapp) ?? "").replace(/\D/g, "") || DEFAULTS.whatsapp,
    aviso: {
      ativo: typeof aviso?.ativo === "boolean" ? aviso.ativo : DEFAULTS.aviso.ativo,
      texto: typeof aviso?.texto === "string" && aviso.texto.trim() ? aviso.texto.trim() : DEFAULTS.aviso.texto,
    },
  };
}

export async function getRegraPrecoAtacado(config?: AtacadoConfig): Promise<RegraPrecoAtacado> {
  const [cfg, markups] = await Promise.all([config ?? getAtacadoConfig(), getPlusSizeMarkups()]);
  return { markups, descontos: cfg.descontos };
}

async function upsert(key: string, value: string) {
  const db = createNoStoreAdminClient();
  const { error } = await db
    .from("system_config")
    .upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

export async function saveAtacadoConfig(patch: {
  descontos?: DescontosAtacado;
  minimoPecas?: number;
  whatsapp?: string;
  aviso?: AvisoNovidades;
}): Promise<void> {
  if (patch.descontos) await upsert(KEYS.descontos, JSON.stringify(patch.descontos));
  if (patch.minimoPecas !== undefined) await upsert(KEYS.minimoPecas, String(patch.minimoPecas));
  if (patch.whatsapp !== undefined) await upsert(KEYS.whatsapp, patch.whatsapp);
  if (patch.aviso) await upsert(KEYS.aviso, JSON.stringify(patch.aviso));
}

/** Gera um token novo (32 caracteres): o link e os cookies anteriores deixam de valer. */
export async function regenerateAtacadoToken(): Promise<string> {
  const token = randomBytes(16).toString("hex");
  await upsert(KEYS.token, token);
  return token;
}

export function newRomaneioToken(): string {
  return randomBytes(24).toString("base64url"); // 32 caracteres, seguro em URL
}
