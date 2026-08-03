"use client";

import { useState, useCallback } from "react";

export interface ShippingOption {
  id: number;
  name: string;
  company: string;
  preco: number; // R$
  prazo: number; // dias úteis
}

export interface ShippingItemInput {
  weight_g?: number | null;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  quantity: number;
}

// Mensagens idênticas às usadas historicamente no checkout — preservadas aqui
// para que o refactor do checkout não altere nenhum texto visível.
const ERRO_API_PADRAO = "Erro ao calcular frete.";
const ERRO_REDE_PADRAO = "Falha ao calcular opções de frete.";

// Cálculo de frete via Melhor Envio — mesma lógica usada no checkout,
// extraída para reuso também no carrinho.
export function useShipping(items: ShippingItemInput[]) {
  const [opcoes, setOpcoes] = useState<ShippingOption[]>([]);
  const [opcaoSelecionada, setOpcaoSelecionada] = useState<ShippingOption | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [erro, setErro] = useState("");

  const calcularFrete = useCallback(
    async (cep: string) => {
      const digits = cep.replace(/\D/g, "");
      if (digits.length !== 8) return;

      const produtos = items.map((item) => ({
        peso_g: item.weight_g ?? 400,
        comprimento_cm: item.length_cm ?? 30,
        largura_cm: item.width_cm ?? 20,
        altura_cm: item.height_cm ?? 10,
        quantity: item.quantity,
      }));

      setCalculando(true);
      setErro("");
      setOpcoes([]);
      setOpcaoSelecionada(null);

      try {
        const res = await fetch("/api/shipping/melhorenvio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cepDestino: digits, produtos }),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          setErro(data.error ?? ERRO_API_PADRAO);
        } else {
          setOpcoes(data.opcoes ?? []);
        }
      } catch {
        setErro(ERRO_REDE_PADRAO);
      } finally {
        setCalculando(false);
      }
    },
    [items]
  );

  const limparFrete = useCallback(() => {
    setOpcoes([]);
    setOpcaoSelecionada(null);
    setErro("");
  }, []);

  return {
    opcoes,
    opcaoSelecionada,
    selecionarOpcao: setOpcaoSelecionada,
    calculando,
    erro,
    calcularFrete,
    limparFrete,
  };
}
