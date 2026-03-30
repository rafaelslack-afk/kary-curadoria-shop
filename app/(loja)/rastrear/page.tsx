"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Package, Truck, MapPin, ChevronLeft } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import type { OrderStatus, PaymentMethod } from "@/types/database";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface TrackItem {
  id: string;
  product_name: string;
  size_snapshot: string;
  color_snapshot: string | null;
  sku_snapshot: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface TrackResult {
  order_number: number;
  status: OrderStatus;
  payment_method: PaymentMethod | null;
  total: number;
  subtotal: number;
  shipping_cost: number;
  discount: number;
  shipping_service: string | null;
  shipping_deadline: number | null;
  shipping_address_json: {
    cep: string; logradouro: string; numero: string;
    complemento?: string; bairro: string; cidade: string; estado: string;
  };
  tracking_code: string | null;
  created_at: string;
  order_items: TrackItem[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending:   "Pagamento pendente",
  paid:      "Pagamento confirmado",
  preparing: "Em preparação",
  shipped:   "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

const STATUS_CLASS: Record<OrderStatus, string> = {
  pending:   "bg-amber-100 text-amber-700",
  paid:      "bg-blue-100 text-blue-700",
  preparing: "bg-purple-100 text-purple-700",
  shipped:   "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  pix:         "PIX",
  credit_card: "Cartão de crédito",
  boleto:      "Boleto",
};

// Linha do tempo de progresso
const STATUS_STEPS: OrderStatus[] = ["paid", "preparing", "shipped", "delivered"];
function stepIndex(status: OrderStatus) {
  if (status === "pending") return -1;
  if (status === "cancelled") return -2;
  return STATUS_STEPS.indexOf(status);
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function RastrearPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orderNumber.trim() || !email.trim()) return;

    setLoading(true);
    setResult(null);
    setError("");

    try {
      const res = await fetch(
        `/api/orders/track?order_number=${encodeURIComponent(orderNumber.trim())}&email=${encodeURIComponent(email.trim())}`
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Pedido não encontrado.");
        return;
      }
      setResult(data);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const addr = result?.shipping_address_json;
  const currentStep = result ? stepIndex(result.status) : -99;

  return (
    <div className="min-h-screen bg-kc-cream">
      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-[10px] tracking-[0.2em] text-kc-muted hover:text-kc-dark transition-colors uppercase mb-6"
          >
            <ChevronLeft size={12} />
            Início
          </Link>
          <p className="text-[10px] tracking-[0.26em] text-kc-muted uppercase mb-1">Acompanhamento</p>
          <h1 className="font-serif text-3xl font-medium text-kc-dark">Rastrear Pedido</h1>
          <p className="text-sm text-kc-muted mt-2">
            Informe o número do pedido e o e-mail utilizado na compra.
          </p>
        </div>

        {/* Formulário de busca */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-kc-line p-6 mb-8 space-y-4"
        >
          <div>
            <label className="block text-[11px] tracking-wider text-gray-500 uppercase mb-1.5">
              Número do Pedido
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value.replace(/\D/g, ""))}
              placeholder="Ex: 1042"
              required
              className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-kc"
            />
          </div>

          <div>
            <label className="block text-[11px] tracking-wider text-gray-500 uppercase mb-1.5">
              E-mail do Pedido
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              required
              className="w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-kc"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-kc text-white py-3 text-[11px] tracking-[0.2em] uppercase hover:bg-kc-dark transition-colors disabled:opacity-60"
          >
            {loading ? (
              <span className="animate-pulse">Buscando...</span>
            ) : (
              <>
                <Search size={14} />
                Rastrear Pedido
              </>
            )}
          </button>
        </form>

        {/* Resultado */}
        {result && (
          <div className="space-y-5">

            {/* Status + cabeçalho */}
            <div className="bg-white rounded-xl border border-kc-line p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[10px] tracking-[0.2em] text-kc-muted uppercase mb-1">
                    Pedido #{result.order_number}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(result.created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit", month: "long", year: "numeric",
                    })}
                  </p>
                </div>
                <span className={cn(
                  "text-[10px] tracking-wider uppercase px-3 py-1.5 rounded-full font-medium",
                  STATUS_CLASS[result.status]
                )}>
                  {STATUS_LABEL[result.status]}
                </span>
              </div>

              {/* Linha do tempo (só para pedidos não cancelados / pendentes) */}
              {currentStep >= 0 && (
                <div className="mt-4">
                  <div className="flex items-center gap-0">
                    {STATUS_STEPS.map((s, i) => {
                      const done = i <= currentStep;
                      const isLast = i === STATUS_STEPS.length - 1;
                      return (
                        <div key={s} className="flex items-center flex-1 last:flex-none">
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors",
                            done ? "bg-kc text-white" : "bg-gray-100 text-gray-400"
                          )}>
                            {i + 1}
                          </div>
                          {!isLast && (
                            <div className={cn(
                              "flex-1 h-0.5 mx-1",
                              i < currentStep ? "bg-kc" : "bg-gray-100"
                            )} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-1.5 text-[9px] tracking-wide text-gray-400 uppercase">
                    <span>Pago</span>
                    <span className="text-center">Preparando</span>
                    <span className="text-center">Enviado</span>
                    <span>Entregue</span>
                  </div>
                </div>
              )}
            </div>

            {/* Rastreio Correios */}
            {result.tracking_code && (
              <div className="bg-white rounded-xl border border-kc-line p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Truck size={16} className="text-kc" />
                  <h2 className="font-serif text-base font-medium text-kc-dark">Rastreio</h2>
                </div>
                <p className="text-xs text-gray-500 mb-2">
                  {result.shipping_service ?? "Correios"}{result.shipping_deadline ? ` · prazo estimado: ${result.shipping_deadline} dias úteis` : ""}
                </p>
                <div className="flex items-center gap-3">
                  <code className="flex-1 bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm font-mono tracking-widest text-kc-dark">
                    {result.tracking_code}
                  </code>
                  <a
                    href={`https://rastreamento.correios.com.br/app/index.php?objeto=${result.tracking_code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] tracking-[0.16em] uppercase text-kc hover:underline whitespace-nowrap"
                  >
                    Ver nos Correios →
                  </a>
                </div>
              </div>
            )}

            {/* Itens */}
            <div className="bg-white rounded-xl border border-kc-line p-5">
              <div className="flex items-center gap-2 mb-4">
                <Package size={16} className="text-kc" />
                <h2 className="font-serif text-base font-medium text-kc-dark">
                  Itens do Pedido
                </h2>
              </div>

              <div className="divide-y divide-gray-100">
                {result.order_items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-kc-dark leading-snug">{item.product_name}</p>
                      <p className="text-[11px] text-kc-muted mt-0.5">
                        {[item.color_snapshot, item.size_snapshot].filter(Boolean).join(" / ")}
                        {item.sku_snapshot && (
                          <span className="font-mono ml-2">· {item.sku_snapshot}</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-500">{item.quantity}× {formatCurrency(item.unit_price)}</p>
                      <p className="text-sm font-medium text-kc-dark">{formatCurrency(item.total_price)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Resumo financeiro */}
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-1 max-w-xs ml-auto">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Subtotal</span>
                  <span>{formatCurrency(result.subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Frete</span>
                  <span>{formatCurrency(result.shipping_cost)}</span>
                </div>
                {result.discount > 0 && (
                  <div className="flex justify-between text-xs text-green-600">
                    <span>Desconto</span>
                    <span>− {formatCurrency(result.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-semibold text-kc-dark pt-1.5 border-t border-gray-100">
                  <span>Total</span>
                  <span>{formatCurrency(result.total)}</span>
                </div>
                {result.payment_method && (
                  <p className="text-[10px] text-gray-400 text-right">
                    via {PAYMENT_LABEL[result.payment_method]}
                  </p>
                )}
              </div>
            </div>

            {/* Endereço */}
            {addr && (
              <div className="bg-white rounded-xl border border-kc-line p-5">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={16} className="text-kc" />
                  <h2 className="font-serif text-base font-medium text-kc-dark">Endereço de Entrega</h2>
                </div>
                <address className="not-italic text-sm text-gray-700 leading-relaxed">
                  {addr.logradouro}, {addr.numero}
                  {addr.complemento && ` — ${addr.complemento}`}
                  <br />
                  {addr.bairro} · {addr.cidade} / {addr.estado}
                  <br />
                  CEP {addr.cep}
                </address>
              </div>
            )}

            {/* Dúvidas */}
            <div className="text-center py-4">
              <p className="text-xs text-kc-muted mb-2">Dúvidas sobre seu pedido?</p>
              <a
                href="https://wa.me/5511992169377"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.16em] uppercase text-kc hover:text-kc-dark transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.118 1.532 5.845L.057 23.716a.5.5 0 0 0 .608.625l5.926-1.51A11.944 11.944 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.956 0-3.792-.56-5.35-1.53l-.39-.24-4.04 1.03 1.03-3.95-.25-.41A9.941 9.941 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                </svg>
                Falar no WhatsApp
              </a>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
