"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Package,
  MapPin,
  CreditCard,
  Truck,
  FileText,
  StickyNote,
  Loader2,
  Check,
  Printer,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, cn } from "@/lib/utils";
import type { OrderStatus, PaymentMethod, NfStatus, Address } from "@/types/database";

// -----------------------------------------------------------------------
// Tipos locais
// -----------------------------------------------------------------------

interface OrderItem {
  id: string;
  product_id: string;
  variant_id: string;
  product_name: string;
  size_snapshot: string;
  color_snapshot: string | null;
  sku_snapshot: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface FullOrder {
  id: string;
  order_number: number;
  status: OrderStatus;
  payment_method: PaymentMethod | null;
  pagbank_charge_id: string | null;
  pagbank_status: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_cpf: string | null;
  customer_phone: string | null;
  subtotal: number;
  shipping_cost: number;
  discount: number;
  coupon_code: string | null;
  total: number;
  shipping_service: string | null;
  shipping_deadline: number | null;
  shipping_address_json: Address;
  tracking_code: string | null;
  nf_number: string | null;
  nf_key: string | null;
  nf_status: NfStatus | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[];
}

// -----------------------------------------------------------------------
// Helpers visuais
// -----------------------------------------------------------------------

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "pending",   label: "Pendente"   },
  { value: "paid",      label: "Pago"       },
  { value: "preparing", label: "Preparando" },
  { value: "shipped",   label: "Enviado"    },
  { value: "delivered", label: "Entregue"   },
  { value: "cancelled", label: "Cancelado"  },
];

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
  credit_card: "Cartão de Crédito",
  boleto:      "Boleto",
};

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <span className="text-kc-muted">{icon}</span>
        <h2 className="font-medium text-sm text-kc-dark tracking-wide">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm text-gray-800">{value || <span className="text-gray-300">—</span>}</p>
    </div>
  );
}

// -----------------------------------------------------------------------
// Componente principal
// -----------------------------------------------------------------------

export default function PedidoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<FullOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // qual seção está salvando
  const [saved, setSaved] = useState<string | null>(null);   // feedback de sucesso

  // Campos editáveis
  const [status, setStatus] = useState<OrderStatus>("pending");
  const [trackingCode, setTrackingCode] = useState("");
  const [nfNumber, setNfNumber] = useState("");
  const [nfKey, setNfKey] = useState("");
  const [nfStatus, setNfStatus] = useState<NfStatus | "">("");
  const [notes, setNotes] = useState("");

  // Geração de etiqueta
  const [generatingLabel, setGeneratingLabel] = useState(false);
  const [labelUrl, setLabelUrl] = useState<string | null>(null);
  const [labelError, setLabelError] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchOrder();
  }, [id]);

  async function fetchOrder() {
    try {
      const res = await fetch(`/api/orders/${id}?full=1`);
      if (!res.ok) throw new Error("Pedido não encontrado");
      const data: FullOrder = await res.json();
      setOrder(data);
      setStatus(data.status);
      setTrackingCode(data.tracking_code ?? "");
      setNfNumber(data.nf_number ?? "");
      setNfKey(data.nf_key ?? "");
      setNfStatus(data.nf_status ?? "");
      setNotes(data.notes ?? "");
    } catch (err) {
      console.error("Erro ao carregar pedido:", err);
    } finally {
      setLoading(false);
    }
  }

  async function savePatch(section: string, patch: Record<string, unknown>) {
    setSaving(section);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`Erro ao salvar: ${err.error ?? "Tente novamente."}`);
        return;
      }
      setSaved(section);
      setTimeout(() => setSaved(null), 2500);
    } catch {
      alert("Erro de rede. Tente novamente.");
    } finally {
      setSaving(null);
    }
  }

  async function handleGenerateLabel() {
    setGeneratingLabel(true);
    setLabelError(null);
    try {
      const res = await fetch(`/api/admin/orders/${id}/label`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao gerar etiqueta");
      setLabelUrl(data.labelUrl ?? null);
      if (data.trackingCode) {
        setTrackingCode(data.trackingCode);
        // Recarrega o pedido para refletir status "shipped"
        fetchOrder();
      }
      alert(data.message);
    } catch (err: unknown) {
      setLabelError(err instanceof Error ? err.message : String(err));
    } finally {
      setGeneratingLabel(false);
    }
  }

  function SaveButton({ section }: { section: string }) {
    const isSaving = saving === section;
    const isDone = saved === section;
    return (
      <Button
        size="sm"
        disabled={isSaving}
        onClick={() => {
          if (section === "status")   savePatch(section, { status });
          if (section === "tracking") savePatch(section, { tracking_code: trackingCode });
          if (section === "nf")       savePatch(section, { nf_number: nfNumber, nf_key: nfKey, nf_status: nfStatus || null });
          if (section === "notes")    savePatch(section, { notes });
        }}
        className={cn(isDone && "bg-green-600 hover:bg-green-600")}
      >
        {isSaving ? (
          <Loader2 size={14} className="animate-spin mr-1" />
        ) : isDone ? (
          <Check size={14} className="mr-1" />
        ) : null}
        {isDone ? "Salvo!" : "Salvar"}
      </Button>
    );
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 size={24} className="animate-spin mr-2" />
        Carregando pedido...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <Package size={40} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500 mb-4">Pedido não encontrado.</p>
        <Button size="sm" onClick={() => router.push("/admin/pedidos")}>
          <ArrowLeft size={14} className="mr-1.5" />
          Voltar
        </Button>
      </div>
    );
  }

  const addr = order.shipping_address_json;

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push("/admin/pedidos")}
          className="text-gray-400 hover:text-kc transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-serif font-medium text-kc-dark">
            Pedido #{order.order_number}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(order.created_at).toLocaleDateString("pt-BR", {
              day: "2-digit", month: "long", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </p>
        </div>
        <span className={cn("text-xs px-3 py-1 rounded-full font-medium", STATUS_CLASS[order.status])}>
          {STATUS_OPTIONS.find((s) => s.value === order.status)?.label}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-6">

          {/* Itens do pedido */}
          <SectionCard title="Itens do Pedido" icon={<Package size={16} />}>
            <div className="divide-y divide-gray-100">
              {order.order_items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="w-10 h-10 rounded bg-kc/10 flex items-center justify-center flex-shrink-0">
                    <Package size={18} className="text-kc/50" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.product_name}</p>
                    <p className="text-xs text-gray-400">
                      {[item.color_snapshot, item.size_snapshot].filter(Boolean).join(" / ")}
                      {item.sku_snapshot && ` · SKU: ${item.sku_snapshot}`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm text-gray-700">
                      {item.quantity}× {formatCurrency(item.unit_price)}
                    </p>
                    <p className="text-xs font-medium text-kc">{formatCurrency(item.total_price)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Resumo financeiro */}
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-1.5">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Frete ({order.shipping_service ?? "—"})</span>
                <span>{formatCurrency(order.shipping_cost)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Desconto {order.coupon_code && `(${order.coupon_code})`}</span>
                  <span>−{formatCurrency(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold text-kc-dark pt-1 border-t border-gray-100">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </SectionCard>

          {/* Endereço de entrega */}
          <SectionCard title="Endereço de Entrega" icon={<MapPin size={16} />}>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Logradouro" value={`${addr?.logradouro}, ${addr?.numero}`} />
              {addr?.complemento && <Field label="Complemento" value={addr.complemento} />}
              <Field label="Bairro" value={addr?.bairro} />
              <Field label="Cidade / UF" value={addr ? `${addr.cidade} / ${addr.estado}` : ""} />
              <Field label="CEP" value={addr?.cep} />
              {order.shipping_deadline && (
                <Field label="Prazo estimado" value={`${order.shipping_deadline} dias úteis`} />
              )}
            </div>
          </SectionCard>

          {/* Pagamento */}
          <SectionCard title="Pagamento" icon={<CreditCard size={16} />}>
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Método"
                value={order.payment_method ? PAYMENT_LABEL[order.payment_method] : undefined}
              />
              <Field label="Status MP" value={order.pagbank_status} />
              <Field label="ID Mercado Pago" value={order.pagbank_charge_id} />
            </div>
          </SectionCard>

          {/* Nota Fiscal */}
          <SectionCard title="Nota Fiscal" icon={<FileText size={16} />}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[11px] text-gray-400 uppercase tracking-wider mb-1">
                  Número NF
                </label>
                <input
                  type="text"
                  value={nfNumber}
                  onChange={(e) => setNfNumber(e.target.value)}
                  placeholder="Ex.: 000123"
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-kc"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 uppercase tracking-wider mb-1">
                  Status NF
                </label>
                <select
                  value={nfStatus}
                  onChange={(e) => setNfStatus(e.target.value as NfStatus | "")}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-kc"
                >
                  <option value="">Não emitida</option>
                  <option value="emitida">Emitida</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] text-gray-400 uppercase tracking-wider mb-1">
                  Chave NF-e
                </label>
                <input
                  type="text"
                  value={nfKey}
                  onChange={(e) => setNfKey(e.target.value)}
                  placeholder="44 dígitos da chave de acesso"
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-kc"
                />
              </div>
            </div>
            <SaveButton section="nf" />
          </SectionCard>

          {/* Observações */}
          <SectionCard title="Observações Internas" icon={<StickyNote size={16} />}>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Anotações visíveis apenas para o admin..."
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-kc resize-none mb-3"
            />
            <SaveButton section="notes" />
          </SectionCard>
        </div>

        {/* Coluna lateral */}
        <div className="space-y-6">

          {/* Cliente */}
          <SectionCard title="Cliente" icon={<Package size={16} />}>
            <div className="space-y-3">
              <Field label="Nome" value={order.guest_name} />
              <Field label="E-mail" value={order.guest_email} />
              <Field label="CPF" value={order.guest_cpf} />
              {order.customer_phone && (
                <div>
                  <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-0.5">Telefone</p>
                  <a
                    href={`https://wa.me/55${order.customer_phone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-[#A0622A] hover:underline"
                  >
                    <Phone size={13} className="shrink-0" />
                    {formatPhone(order.customer_phone)}
                  </a>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Status do pedido */}
          <SectionCard title="Status do Pedido" icon={<Package size={16} />}>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus)}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-kc mb-3"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <SaveButton section="status" />
          </SectionCard>

          {/* Rastreio */}
          <SectionCard title="Código de Rastreio" icon={<Truck size={16} />}>
            <input
              type="text"
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
              placeholder="AA123456789BR"
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm font-mono tracking-widest focus:outline-none focus:border-kc mb-3"
            />
            <SaveButton section="tracking" />
            {order.tracking_code && (
              <a
                href={`https://rastreamento.correios.com.br/app/index.php?objeto=${order.tracking_code}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-kc hover:underline mt-2"
              >
                Rastrear nos Correios →
              </a>
            )}

            {/* Gerar Etiqueta Melhor Envio */}
            {(order.status === "paid" || order.status === "preparing") && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                <p className="text-[11px] text-gray-400 uppercase tracking-wider">
                  Melhor Envio
                </p>
                <Button
                  size="sm"
                  disabled={generatingLabel}
                  onClick={handleGenerateLabel}
                  className="w-full bg-[#A0622A] hover:bg-[#8a5224] text-white disabled:opacity-60"
                >
                  {generatingLabel ? (
                    <>
                      <Loader2 size={13} className="animate-spin mr-1.5" />
                      Gerando etiqueta...
                    </>
                  ) : (
                    <>
                      <Printer size={13} className="mr-1.5" />
                      Gerar Etiqueta de Envio
                    </>
                  )}
                </Button>

                {labelUrl && (
                  <a
                    href={labelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-[#A0622A] hover:underline"
                  >
                    <Printer size={12} />
                    Imprimir Etiqueta
                  </a>
                )}

                {labelError && (
                  <p className="text-xs text-red-500 leading-snug">
                    Erro: {labelError}
                  </p>
                )}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
