"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search, Settings, Store } from "lucide-react";
import { STATUS_ATACADO, statusAtacadoInfo } from "@/lib/atacado/status";
import { labelFormaPagamento } from "@/lib/atacado/pricing";
import { formatarDocumento } from "@/lib/atacado/documento";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";

interface Row {
  id: string;
  order_number: string;
  status: string;
  payment_method: string;
  customer_name: string;
  store_name: string | null;
  document: string;
  address_json: { cidade?: string; uf?: string } | null;
  pieces_count: number;
  total: number;
  created_at: string;
}

export default function AtacadoPedidosPage() {
  const [orders, setOrders] = useState<Row[]>([]);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (busca) params.set("q", busca);
      const res = await fetch(`/api/admin/atacado/pedidos?${params}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao carregar.");
      setOrders(data.orders ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [status, busca]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Store size={22} className="text-kc-muted" strokeWidth={1.5} />
          <h1 className="text-2xl font-serif font-medium text-kc-dark">Atacado</h1>
        </div>
        <Link
          href="/admin/atacado/configuracoes"
          prefetch={false}
          className="inline-flex items-center gap-2 text-sm text-kc-dark border border-gray-200 bg-white rounded-md px-3 py-2 hover:bg-gray-50"
        >
          <Settings size={16} /> Configurações e link
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <form
          className="relative flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            setBusca(q.trim());
          }}
        >
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por número, nome ou CPF/CNPJ (Enter)"
            className="w-full border border-gray-200 rounded-md pl-9 pr-3 py-2 text-sm bg-white"
          />
        </form>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
          aria-label="Filtrar por status"
        >
          <option value="">Todos os status</option>
          {STATUS_ATACADO.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Pedido</th>
              <th className="text-left px-4 py-3 font-medium">Data</th>
              <th className="text-left px-4 py-3 font-medium">Cliente</th>
              <th className="text-left px-4 py-3 font-medium">Cidade</th>
              <th className="text-right px-4 py-3 font-medium">Peças</th>
              <th className="text-right px-4 py-3 font-medium">Total</th>
              <th className="text-left px-4 py-3 font-medium">Pagamento</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map((o) => {
              const st = statusAtacadoInfo(o.status);
              return (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/atacado/${o.id}`} prefetch={false} className="font-medium text-kc hover:underline">
                      {o.order_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDateTime(o.created_at)}</td>
                  <td className="px-4 py-3">
                    <p className="text-kc-dark">{o.customer_name}</p>
                    <p className="text-xs text-gray-500">
                      {o.store_name ? `${o.store_name} · ` : ""}
                      {formatarDocumento(o.document)}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {o.address_json?.cidade}/{o.address_json?.uf}
                  </td>
                  <td className="px-4 py-3 text-right">{o.pieces_count}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{formatCurrency(Number(o.total))}</td>
                  <td className="px-4 py-3 text-gray-600">{labelFormaPagamento(o.payment_method)}</td>
                  <td className="px-4 py-3">
                    <span className={cn("text-[11px] font-medium px-2 py-1 rounded-full whitespace-nowrap", st.color)}>{st.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && orders.length === 0 && <p className="text-center text-sm text-gray-500 py-10">Nenhum pedido encontrado.</p>}
        {loading && <p className="text-center text-sm text-gray-400 py-10">Carregando…</p>}
      </div>
    </div>
  );
}
