"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Package,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import type { OrderStatus, PaymentMethod } from "@/types/database";

// -----------------------------------------------------------------------
// Tipos
// -----------------------------------------------------------------------

type Periodo = "hoje" | "7d" | "30d";

interface StatsData {
  periodo: Periodo;
  totalReceita: number;
  totalPedidos: number;
  ticketMedio: number;
  alertasEstoque: number;
  pedidosRecentes: {
    id: string;
    order_number: number;
    guest_name: string | null;
    status: OrderStatus;
    total: number;
    created_at: string;
    payment_method: PaymentMethod | null;
  }[];
  topProdutos: { name: string; qty: number }[];
}

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending:   "Pendente",
  paid:      "Pago",
  preparing: "Preparando",
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

const PERIODO_LABEL: Record<Periodo, string> = {
  hoje: "Hoje",
  "7d": "7 dias",
  "30d": "30 dias",
};

// -----------------------------------------------------------------------
// Componente KPI Card
// -----------------------------------------------------------------------

function KpiCard({
  title,
  value,
  icon,
  alert,
  periodo,
  onPeriodo,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  alert?: boolean;
  periodo?: Periodo;
  onPeriodo?: (p: Periodo) => void;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500 tracking-wide uppercase">{title}</span>
        <span className={alert ? "text-amber-500" : "text-kc-muted"}>{icon}</span>
      </div>

      {periodo && onPeriodo && (
        <div className="flex gap-1 mb-3">
          {(["hoje", "7d", "30d"] as Periodo[]).map((p) => (
            <button
              key={p}
              onClick={() => onPeriodo(p)}
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full border transition-colors",
                periodo === p
                  ? "bg-kc text-white border-kc"
                  : "border-gray-200 text-gray-400 hover:border-kc hover:text-kc"
              )}
            >
              {PERIODO_LABEL[p]}
            </button>
          ))}
        </div>
      )}

      <p className="text-2xl font-medium text-kc-dark">{value}</p>
    </div>
  );
}

// -----------------------------------------------------------------------
// Dashboard principal
// -----------------------------------------------------------------------

export default function AdminDashboard() {
  const [periodo, setPeriodo] = useState<Periodo>("30d");
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async (p: Periodo) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/stats?periodo=${p}`);
      if (res.ok) setStats(await res.json());
    } catch (err) {
      console.error("Erro ao carregar stats:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(periodo);
  }, [periodo, fetchStats]);

  const shimmer = "animate-pulse bg-gray-100 rounded";

  return (
    <div>
      <h1 className="text-2xl font-serif font-medium text-kc-dark mb-6">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          title="Receita Total"
          icon={<DollarSign size={20} />}
          value={loading ? "..." : formatCurrency(stats?.totalReceita ?? 0)}
          periodo={periodo}
          onPeriodo={setPeriodo}
        />
        <KpiCard
          title="Pedidos Pagos"
          icon={<ShoppingCart size={20} />}
          value={loading ? "..." : String(stats?.totalPedidos ?? 0)}
          periodo={periodo}
          onPeriodo={setPeriodo}
        />
        <KpiCard
          title="Ticket Médio (30d)"
          icon={<TrendingUp size={20} />}
          value={loading ? "..." : formatCurrency(stats?.ticketMedio ?? 0)}
        />
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500 tracking-wide uppercase">Alertas de Estoque</span>
            <span className="text-amber-500"><AlertTriangle size={20} /></span>
          </div>
          <p className="text-2xl font-medium text-kc-dark">
            {loading ? "..." : stats?.alertasEstoque ?? 0}
          </p>
          {(stats?.alertasEstoque ?? 0) > 0 && (
            <Link href="/admin/estoque" className="text-xs text-amber-600 hover:underline mt-1 block">
              Ver estoque →
            </Link>
          )}
        </div>
      </div>

      {/* Tabelas inferiores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Pedidos recentes */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h2 className="font-serif text-base font-medium text-kc-dark">Pedidos Recentes</h2>
            <Link href="/admin/pedidos" className="text-xs text-kc hover:underline">
              Ver todos →
            </Link>
          </div>
          {loading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className={cn(shimmer, "h-8")} />
              ))}
            </div>
          ) : !stats?.pedidosRecentes?.length ? (
            <div className="p-8 text-center text-sm text-gray-400">Nenhum pedido ainda.</div>
          ) : (
            <table className="w-full">
              <tbody>
                {stats.pedidosRecentes.map((o) => (
                  <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <Link href={`/admin/pedidos/${o.id}`} className="text-sm font-medium text-kc hover:underline">
                        #{o.order_number}
                      </Link>
                      <p className="text-xs text-gray-400">{o.guest_name ?? "—"}</p>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={cn("text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full", STATUS_CLASS[o.status])}>
                        {STATUS_LABEL[o.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-medium text-kc-dark">
                      {formatCurrency(o.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Top produtos (30d) */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h2 className="font-serif text-base font-medium text-kc-dark">Top Produtos (30 dias)</h2>
            <Link href="/admin/produtos" className="text-xs text-kc hover:underline">
              Ver produtos →
            </Link>
          </div>
          {loading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className={cn(shimmer, "h-8")} />
              ))}
            </div>
          ) : !stats?.topProdutos?.length ? (
            <div className="p-8 text-center text-sm text-gray-400">
              <Package size={32} className="mx-auto text-gray-200 mb-2" />
              Nenhuma venda no período.
            </div>
          ) : (
            <div className="p-5 space-y-3">
              {stats.topProdutos.map((p, idx) => {
                const max = stats.topProdutos[0]?.qty ?? 1;
                const pct = Math.round((p.qty / max) * 100);
                return (
                  <div key={p.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-800 flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-gray-400 w-4">{idx + 1}.</span>
                        {p.name}
                      </span>
                      <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{p.qty} un.</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-kc rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
