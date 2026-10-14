"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { RegraPrecoAtacado } from "@/lib/atacado/pricing";

export interface AtacadoClientConfig {
  regra: RegraPrecoAtacado;
  minimoPecas: number;
  whatsapp: string;
  aviso: { ativo: boolean; texto: string };
}

const AtacadoContext = createContext<AtacadoClientConfig | null>(null);

export function AtacadoProvider({ config, children }: { config: AtacadoClientConfig; children: React.ReactNode }) {
  return <AtacadoContext.Provider value={config}>{children}</AtacadoContext.Provider>;
}

export function useAtacadoConfig(): AtacadoClientConfig {
  const ctx = useContext(AtacadoContext);
  if (!ctx) throw new Error("useAtacadoConfig fora do AtacadoProvider");
  return ctx;
}

// O carrinho e a forma de pagamento vêm do localStorage: só usar depois de
// montar, para o HTML do servidor e o do navegador baterem.
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
