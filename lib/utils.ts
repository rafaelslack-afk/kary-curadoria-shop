// ============================================================
// KVO — Utilitários Gerais
// ============================================================

/**
 * Formata valor monetário em Real Brasileiro
 * Ex: 389.00 → "R$ 389,00"
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Gera slug a partir de texto
 * Ex: "Conjunto Linho Off-White Premium" → "conjunto-linho-off-white-premium"
 */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // Remove caracteres especiais
    .replace(/[\s_]+/g, "-") // Espaços e underscores → hifens
    .replace(/-+/g, "-") // Remove hifens duplicados
    .replace(/^-|-$/g, ""); // Remove hifens no início e fim
}

/**
 * Formata data para exibição em pt-BR
 * Ex: "2026-03-18T12:00:00Z" → "18/03/2026"
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

/**
 * Formata data e hora para exibição
 * Ex: "2026-03-18T12:30:00Z" → "18/03/2026 às 12:30"
 */
export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

/**
 * Traduz status do pedido para português legível
 */
export function translateOrderStatus(status: string): string {
  const map: Record<string, string> = {
    pending: "Pendente",
    paid: "Pago",
    preparing: "Preparando",
    shipped: "Enviado",
    delivered: "Entregue",
    cancelled: "Cancelado",
  };
  return map[status] || status;
}

/**
 * Retorna a cor do badge baseado no status do pedido
 */
export function getOrderStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    paid: "bg-green-100 text-green-800",
    preparing: "bg-blue-100 text-blue-800",
    shipped: "bg-purple-100 text-purple-800",
    delivered: "bg-emerald-100 text-emerald-800",
    cancelled: "bg-red-100 text-red-800",
  };
  return map[status] || "bg-gray-100 text-gray-800";
}

/**
 * Traduz método de pagamento para exibição
 */
export function translatePaymentMethod(method: string): string {
  const map: Record<string, string> = {
    pix: "PIX",
    credit_card: "Cartão de Crédito",
    boleto: "Boleto",
  };
  return map[method] || method;
}

/**
 * Valida CPF (formato e dígitos verificadores)
 */
export function validateCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) return false;

  // Rejeitar CPFs com todos os dígitos iguais
  if (/^(\d)\1+$/.test(cleaned)) return false;

  // Calcular dígitos verificadores
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(10))) return false;

  return true;
}

/**
 * Formata CPF: 12345678900 → 123.456.789-00
 */
export function formatCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, "");
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

/**
 * Formata CEP: 01500000 → 01500-000
 */
export function formatCEP(cep: string): string {
  const cleaned = cep.replace(/\D/g, "");
  return cleaned.replace(/(\d{5})(\d{3})/, "$1-$2");
}

/**
 * Formata telefone: 11992169377 → (11) 99216-9377
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return phone;
}

/**
 * Classe utilitária para combinar classes CSS condicionalmente
 * Similar ao `clsx` mas sem dependência externa
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
