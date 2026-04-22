"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag, AlertTriangle } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { getPendingAlert } from "@/lib/order-expiration";
import type { OrderStatus, PaymentMethod } from "@/types/database";

interface OrderRow {
  id: string;
  order_number: number;
  guest_name: string | null;
  guest_email: string | null;
  status: OrderStatus;
  payment_method: PaymentMethod | null;
  total: number;
  created_at: string;
  tracking_code: string | null;
  shipping_service: string | null;
  shipping_deadline: number | null;
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pendente",
  paid: "Pago",
  preparing: "Preparando",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

const STATUS_CLASS: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  paid: "bg-blue-100 text-blue-700",
  preparing: "bg-purple-100 text-purple-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  pix: "PIX",
  credit_card: "Cartão",
  boleto: "Boleto",
};

// Classe Tailwind para cada cor de alerta retornada por getPendingAlert()
const ALERT_BADGE_CLASS: Record<"yellow" | "orange" | "red", string> = {
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-300",
  orange: "bg-orange-100 text-orange-800 border-orange-300",
  red: "bg-red-100 text-red-800 border-red-300",
};

export default function PedidosPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<OrderStatus | "">("");

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    try {
      const res = await fetch("/api/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Erro ao carregar pedidos:", err);
    } finally {
      setLoading(false);
    }
  }

  const displayed = filterStatus
    ? orders.filter((o) => o.status === filterStatus)
    : orders;

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif font-medium text-kc-dark">Pedidos</h1>

        {/* Filtro de status */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as OrderStatus | "")}
          className="text-sm border border-gray-200 rounded px-3 py-1.5 text-gray-600 focus:outline-none focus:border-kc"
        >
          <option value="">Todos os status</option>
          {(Object.keys(STATUS_LABEL) as OrderStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400">
          Carregando...
        </div>
      ) : displayed.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <ShoppingBag size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">
            {filterStatus
              ? `Nenhum pedido com status "${STATUS_LABEL[filterStatus]}".`
              : "Nenhum pedido ainda."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="min-w-[700px] w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left text-[11px] tracking-wider text-gray-500 uppercase px-4 py-3">
                  Pedido
                </th>
                <th className="text-left text-[11px] tracking-wider text-gray-500 uppercase px-4 py-3">
                  Cliente
                </th>
                <th className="text-left text-[11px] tracking-wider text-gray-500 uppercase px-4 py-3">
                  Data
                </th>
                <th className="text-center text-[11px] tracking-wider text-gray-500 uppercase px-4 py-3">
                  Pagamento
                </th>
                <th className="text-center text-[11px] tracking-wider text-gray-500 uppercase px-4 py-3">
                  Status
                </th>
                <th className="text-right text-[11px] tracking-wider text-gray-500 uppercase px-4 py-3">
                  Total
                </th>
                <th className="text-left text-[11px] tracking-wider text-gray-500 uppercase px-4 py-3">
                  Rastreio
                </th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/pedidos/${order.id}`}
                      className="font-medium text-sm text-kc hover:underline"
                    >
                      #{order.order_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-800">{order.guest_name || "—"}</p>
                    {order.guest_email && (
                      <p className="text-xs text-gray-400">{order.guest_email}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(order.created_at)}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-600">
                    {order.payment_method ? PAYMENT_LABEL[order.payment_method] : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className={cn(
                          "inline-block text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full",
                          STATUS_CLASS[order.status]
                        )}
                      >
                        {STATUS_LABEL[order.status]}
                      </span>
                      {(() => {
                        const alert = getPendingAlert(
                          order.status,
                          order.payment_method,
                          order.created_at
                        );
                        if (!alert) return null;
                        return (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-[9px] tracking-wider uppercase px-2 py-0.5 rounded-full border",
                              ALERT_BADGE_CLASS[alert.color]
                            )}
                            title="Pedido pendente próximo do prazo — cron cancelará automaticamente"
                          >
                            <AlertTriangle size={10} strokeWidth={2} />
                            {alert.label}
                          </span>
                        );
                      })()}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-kc">
                    {formatCurrency(order.total)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                    {order.tracking_code || (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>{/* /overflow-x-auto */}

          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-400 text-right">
            {displayed.length} pedido{displayed.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
