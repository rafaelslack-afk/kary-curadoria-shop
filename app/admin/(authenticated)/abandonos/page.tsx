"use client";

import { useState, useMemo } from "react";
import { ShoppingCart, Search, RotateCcw, MessageCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface CartItem {
  product_name: string;
  sku?: string | null;
  size?: string | null;
  color?: string | null;
  quantity: number;
  unit_price: number;
}

interface AbandonedCheckout {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  cart_items: CartItem[];
  cart_total: number | null;
  recovered: boolean;
  order_id: string | null;
  created_at: string;
}

type Period = "7d" | "30d" | "all";
type StatusFilter = "all" | "abandoned" | "recovered";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPhone(phone: string | null): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function buildWhatsApp(phone: string | null, name: string | null): string {
  const digits = formatPhone(phone);
  if (!digits) return "";
  const numero = digits.startsWith("55") ? digits : `55${digits}`;
  const msg = encodeURIComponent(
    `Olá ${name ?? ""}, vi que você se interessou por peças da Kary Curadoria e não finalizou o pedido. Posso te ajudar?`
  );
  return `https://wa.me/${numero}?text=${msg}`;
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function AbandonosPage() {
  const [records, setRecords] = useState<AbandonedCheckout[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [period, setPeriod] = useState<Period>("7d");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  async function buscar() {
    setLoading(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams({ period, status: statusFilter });
      const res = await fetch(`/api/admin/abandoned-checkouts?${params}`);
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }

  function limpar() {
    setPeriod("7d");
    setStatusFilter("all");
    setSearch("");
    setRecords([]);
    setHasSearched(false);
  }

  // Filtro local por busca de texto
  const filtered = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.toLowerCase();
    return records.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.phone?.includes(q)
    );
  }, [records, search]);

  // Cards de resumo — calculados apenas com os registros do período buscado
  const summary = useMemo(() => {
    const all7d = records; // já filtrado pelo período na API
    const total = all7d.length;
    const recovered = all7d.filter((r) => r.recovered).length;
    const abandoned = all7d.filter((r) => !r.recovered);
    const taxa = total > 0 ? Math.round((recovered / total) * 100) : 0;
    const valorRisco = abandoned.reduce((s, r) => s + (r.cart_total ?? 0), 0);
    return { total, recovered, taxa, valorRisco };
  }, [records]);

  const inputCls =
    "border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#B89070] bg-white";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-serif font-medium text-kc-dark">Abandonos de Checkout</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Clientes que identificaram-se mas não finalizaram o pedido
          </p>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="bg-[#F5F1EA] border border-[#B89070]/30 rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-[10px] tracking-wider text-gray-500 uppercase mb-1">Período</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value as Period)} className={inputCls}>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="all">Todos</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] tracking-wider text-gray-500 uppercase mb-1">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className={inputCls}>
              <option value="all">Todos</option>
              <option value="abandoned">Abandonados</option>
              <option value="recovered">Recuperados</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] tracking-wider text-gray-500 uppercase mb-1">Buscar</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nome, e-mail ou telefone…"
              className={`${inputCls} w-full`}
            />
          </div>
          <button
            onClick={buscar}
            disabled={loading}
            className="flex items-center gap-2 bg-kc-dark text-white text-[11px] tracking-widest uppercase px-5 py-2 rounded hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Search size={13} />
            {loading ? "Buscando…" : "Buscar"}
          </button>
          {hasSearched && (
            <button
              onClick={limpar}
              className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-700 transition-colors"
            >
              <RotateCcw size={12} />
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* ── Cards de resumo ── */}
      {hasSearched && !loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <p className="text-[10px] tracking-widest text-gray-400 uppercase mb-1">Total de abandonos</p>
            <p className="text-2xl font-medium text-kc-dark">{summary.total}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">no período selecionado</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <p className="text-[10px] tracking-widest text-gray-400 uppercase mb-1">Taxa de recuperação</p>
            <p className="text-2xl font-medium text-emerald-600">{summary.taxa}%</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{summary.recovered} recuperado(s)</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <p className="text-[10px] tracking-widest text-gray-400 uppercase mb-1">Valor em risco</p>
            <p className="text-2xl font-medium text-red-500">{formatCurrency(summary.valorRisco)}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">carrinhos não recuperados</p>
          </div>
        </div>
      )}

      {/* ── Estado inicial ── */}
      {!hasSearched && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-300">
          <ShoppingCart size={48} strokeWidth={1} />
          <p className="mt-4 text-sm text-gray-400">Selecione os filtros e clique em Buscar</p>
        </div>
      )}

      {/* ── Tabela ── */}
      {hasSearched && !loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-300">
          <ShoppingCart size={40} strokeWidth={1} />
          <p className="mt-3 text-sm text-gray-400">Nenhum resultado encontrado</p>
        </div>
      )}

      {hasSearched && !loading && filtered.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left text-[10px] tracking-wider text-gray-500 uppercase px-4 py-3">Cliente</th>
                <th className="text-left text-[10px] tracking-wider text-gray-500 uppercase px-4 py-3">Itens</th>
                <th className="text-right text-[10px] tracking-wider text-gray-500 uppercase px-4 py-3">Valor</th>
                <th className="text-left text-[10px] tracking-wider text-gray-500 uppercase px-4 py-3">Data</th>
                <th className="text-center text-[10px] tracking-wider text-gray-500 uppercase px-4 py-3">Status</th>
                <th className="text-center text-[10px] tracking-wider text-gray-500 uppercase px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((r) => {
                const whatsapp = buildWhatsApp(r.phone, r.name);

                return (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-kc-dark text-sm">{r.name ?? "—"}</p>
                      <p className="text-[11px] text-gray-400">{r.email}</p>
                      {r.phone && (
                        <p className="text-[11px] text-gray-400">{r.phone}</p>
                      )}
                    </td>
                    <td className="px-4 py-3" style={{ minWidth: 280 }}>
                      <div className="space-y-2">
                        {r.cart_items.map((item, idx) => (
                          <div key={idx}>
                            <div className="flex items-baseline gap-2 flex-wrap">
                              {item.sku && (
                                <span className="font-mono text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded shrink-0">
                                  {item.sku}
                                </span>
                              )}
                              <span className="text-sm font-medium text-kc-dark">
                                {item.product_name}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {item.color && <span>{item.color} · </span>}
                              {item.size && <span>{item.size} · </span>}
                              <span>{item.quantity}× R$ {item.unit_price.toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium text-kc-dark">
                        {r.cart_total ? formatCurrency(r.cart_total) : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] text-gray-500">{formatDate(r.created_at)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.recovered ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Recuperado
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-600 border border-red-200">
                          Abandonado
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {whatsapp ? (
                        <a
                          href={whatsapp}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Abrir WhatsApp"
                          className="inline-flex items-center gap-1.5 text-[11px] text-emerald-600 hover:text-emerald-800 transition-colors"
                        >
                          <MessageCircle size={14} />
                          WhatsApp
                        </a>
                      ) : (
                        <span className="text-[11px] text-gray-300">Sem telefone</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
          Carregando…
        </div>
      )}
    </div>
  );
}
