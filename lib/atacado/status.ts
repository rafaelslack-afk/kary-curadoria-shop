// Status dos pedidos de atacado (mesmos valores do CHECK da tabela)
export const STATUS_ATACADO = [
  { value: "novo", label: "Novo", color: "bg-blue-100 text-blue-800" },
  { value: "em_negociacao", label: "Em negociação", color: "bg-amber-100 text-amber-800" },
  { value: "aguardando_pagamento", label: "Aguardando pagamento", color: "bg-yellow-100 text-yellow-800" },
  { value: "pago", label: "Pago", color: "bg-green-100 text-green-800" },
  { value: "enviado", label: "Enviado", color: "bg-purple-100 text-purple-800" },
  { value: "cancelado", label: "Cancelado", color: "bg-red-100 text-red-800" },
] as const;

export type StatusAtacado = (typeof STATUS_ATACADO)[number]["value"];

export function isStatusAtacado(v: unknown): v is StatusAtacado {
  return STATUS_ATACADO.some((s) => s.value === v);
}

export function statusAtacadoInfo(v: string) {
  return STATUS_ATACADO.find((s) => s.value === v) ?? { value: v, label: v, color: "bg-gray-100 text-gray-800" };
}
