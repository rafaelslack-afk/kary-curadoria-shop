"use client";

import { useState, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  TrendingUp, Package, BarChart3, CreditCard, Users,
  Download, ChevronDown, ChevronRight, AlertTriangle,
} from "lucide-react";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { exportToCsv } from "@/lib/export-csv";

// ── Paleta ────────────────────────────────────────────────────────────────────

const KC_COLORS = ["#A0622A", "#5C3317", "#B89070", "#EDE8DC", "#D4906A"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function today() { return new Date().toISOString().slice(0, 10); }
function monthStart() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

const PAYMENT_LABEL: Record<string, string> = {
  pix: "PIX", credit_card: "Cartão", boleto: "Boleto",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente", paid: "Pago", preparing: "Preparando",
  shipped: "Enviado", delivered: "Entregue", cancelled: "Cancelado",
};

const STATUS_CLASS: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-700",
  paid:      "bg-blue-100 text-blue-700",
  preparing: "bg-purple-100 text-purple-700",
  shipped:   "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <p className="text-[11px] tracking-wider text-gray-500 uppercase mb-1">{label}</p>
      <p className="text-2xl font-semibold text-kc-dark">{value}</p>
      {sub && <p className="text-xs text-kc-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function DateFilters({
  start, end, onStart, onEnd,
  extra,
}: {
  start: string; end: string;
  onStart: (v: string) => void; onEnd: (v: string) => void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-5">
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500">De</label>
        <input type="date" value={start} onChange={(e) => onStart(e.target.value)}
          className="border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:border-kc" />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500">Até</label>
        <input type="date" value={end} onChange={(e) => onEnd(e.target.value)}
          className="border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:border-kc" />
      </div>
      {extra}
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-10 text-center text-gray-400 text-sm">
      {msg}
    </div>
  );
}

function LoadBtn({ loading, onClick, children }: {
  loading: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} disabled={loading}
      className="bg-kc text-white text-[11px] tracking-[0.14em] uppercase px-4 py-2 hover:bg-kc-dark transition-colors disabled:opacity-60">
      {loading ? "Buscando..." : children}
    </button>
  );
}

// ── Aba 1: Vendas ─────────────────────────────────────────────────────────────

interface SalesData {
  total_revenue: number; total_orders: number; ticket_medio: number;
  revenue_by_day: { date: string; revenue: number; orders: number }[];
  revenue_by_payment: { method: string; revenue: number; count: number }[];
  orders_list: {
    id: string; order_number: number; created_at: string;
    customer: string; payment_method: string | null; status: string; total: number;
  }[];
}

function TabVendas() {
  const [start, setStart] = useState(monthStart());
  const [end,   setEnd]   = useState(today());
  const [data,  setData]  = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/reports/sales?start_date=${start}&end_date=${end}`);
      if (r.ok) setData(await r.json());
    } finally { setLoading(false); }
  }, [start, end]);

  function exportOrders() {
    if (!data) return;
    exportToCsv("vendas", data.orders_list.map((o) => ({
      pedido:    `#${o.order_number}`,
      data:      formatDate(o.created_at),
      cliente:   o.customer,
      pagamento: PAYMENT_LABEL[o.payment_method ?? ""] ?? o.payment_method ?? "—",
      status:    STATUS_LABEL[o.status] ?? o.status,
      total:     o.total,
    })));
  }

  const pieData = data?.revenue_by_payment.map((r) => ({
    name:  PAYMENT_LABEL[r.method] ?? r.method,
    value: r.revenue,
  })) ?? [];

  return (
    <div className="space-y-5">
      <DateFilters start={start} end={end} onStart={setStart} onEnd={setEnd}
        extra={<LoadBtn loading={loading} onClick={fetch_}>Buscar</LoadBtn>} />

      {!data ? (
        <EmptyState msg='Selecione o período e clique em "Buscar".' />
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4">
            <KpiCard label="Receita Total" value={formatCurrency(data.total_revenue)} />
            <KpiCard label="Pedidos" value={String(data.total_orders)} />
            <KpiCard label="Ticket Médio" value={formatCurrency(data.ticket_medio)} />
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Linha — receita por dia */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-[11px] tracking-wider text-gray-500 uppercase mb-4">Receita por dia</p>
              {data.revenue_by_day.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Sem dados</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data.revenue_by_day}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }}
                      tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }}
                      tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(v) => [formatCurrency(Number(v ?? 0)), "Receita"]}
                      labelFormatter={(l) => `Dia ${l}`} />
                    <Line type="monotone" dataKey="revenue" stroke="#A0622A"
                      strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Pizza — métodos */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-[11px] tracking-wider text-gray-500 uppercase mb-4">Por método de pagamento</p>
              {pieData.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Sem dados</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name"
                      cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      } labelLine={false}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={KC_COLORS[i % KC_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Tabela pedidos */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <p className="font-serif text-base font-medium text-kc-dark">Pedidos do período</p>
              <button onClick={exportOrders}
                className="flex items-center gap-1.5 text-xs text-kc hover:text-kc-dark transition-colors">
                <Download size={13} /> Exportar CSV
              </button>
            </div>
            {data.orders_list.length === 0 ? (
              <p className="p-6 text-sm text-gray-400 text-center">Nenhum pedido no período.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {["Pedido", "Data", "Cliente", "Pagamento", "Status", "Total"].map((h) => (
                      <th key={h} className="text-left text-[11px] tracking-wider text-gray-500 uppercase px-4 py-2.5">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.orders_list.map((o) => (
                    <tr key={o.id} className="border-b border-gray-100 hover:bg-gray-50 text-sm">
                      <td className="px-4 py-2.5 font-medium text-kc">#{o.order_number}</td>
                      <td className="px-4 py-2.5 text-gray-500">{formatDate(o.created_at)}</td>
                      <td className="px-4 py-2.5 text-gray-700 truncate max-w-[160px]">{o.customer}</td>
                      <td className="px-4 py-2.5 text-gray-500">
                        {PAYMENT_LABEL[o.payment_method ?? ""] ?? o.payment_method ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn("text-[9px] tracking-wider uppercase px-2 py-0.5 rounded-full font-medium",
                          STATUS_CLASS[o.status] ?? "bg-gray-100 text-gray-500")}>
                          {STATUS_LABEL[o.status] ?? o.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-kc-dark">{formatCurrency(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Aba 2: Produtos ───────────────────────────────────────────────────────────

interface TopProduct {
  product_name: string; sku_base: string;
  total_qty: number; total_revenue: number;
  variants: { color: string | null; size: string; qty: number }[];
}

function TabProdutos() {
  const [start, setStart] = useState(monthStart());
  const [end,   setEnd]   = useState(today());
  const [products, setProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading]   = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/reports/products?start_date=${start}&end_date=${end}`);
      if (r.ok) { const d = await r.json(); setProducts(d.top_products ?? []); }
    } finally { setLoading(false); }
  }, [start, end]);

  const totalQty = products.reduce((s, p) => s + p.total_qty, 0);

  function doExport() {
    exportToCsv("produtos-mais-vendidos", products.map((p, i) => ({
      rank:     i + 1,
      produto:  p.product_name,
      sku_base: p.sku_base,
      qtd:      p.total_qty,
      receita:  p.total_revenue,
      pct:      totalQty > 0 ? `${((p.total_qty / totalQty) * 100).toFixed(1)}%` : "0%",
    })));
  }

  function toggle(name: string) {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(name)) {
        n.delete(name);
      } else {
        n.add(name);
      }
      return n;
    });
  }

  return (
    <div className="space-y-5">
      <DateFilters start={start} end={end} onStart={setStart} onEnd={setEnd}
        extra={<LoadBtn loading={loading} onClick={fetch_}>Buscar</LoadBtn>} />

      {products.length === 0 ? (
        <EmptyState msg={loading ? "Buscando..." : 'Selecione o período e clique em "Buscar".'} />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <p className="font-serif text-base font-medium text-kc-dark">Produtos mais vendidos</p>
            <button onClick={doExport}
              className="flex items-center gap-1.5 text-xs text-kc hover:text-kc-dark transition-colors">
              <Download size={13} /> Exportar CSV
            </button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["#", "Produto", "SKU Base", "Qtd", "Receita", "% do total", ""].map((h) => (
                  <th key={h} className="text-left text-[11px] tracking-wider text-gray-500 uppercase px-4 py-2.5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => {
                const pct = totalQty > 0 ? (p.total_qty / totalQty) * 100 : 0;
                const open = expanded.has(p.product_name);
                return (
                  <>
                    <tr key={p.product_name}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggle(p.product_name)}>
                      <td className="px-4 py-3 text-sm font-medium text-kc-muted">{i + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium text-kc-dark">{p.product_name}</td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-500">{p.sku_base}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-kc-dark">{p.total_qty}</td>
                      <td className="px-4 py-3 text-sm text-kc-dark">{formatCurrency(p.total_revenue)}</td>
                      <td className="px-4 py-3 min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-kc rounded-full"
                              style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 w-10 text-right">
                            {pct.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </td>
                    </tr>
                    {open && p.variants.map((v, vi) => (
                      <tr key={`${p.product_name}-${vi}`}
                        className="bg-kc-light/40 border-b border-gray-100">
                        <td />
                        <td colSpan={2} className="px-6 py-2 text-xs text-gray-500">
                          {[v.color, v.size].filter(Boolean).join(" / ")}
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-600">{v.qty}</td>
                        <td colSpan={3} />
                      </tr>
                    ))}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Aba 3: Estoque vs Vendas ──────────────────────────────────────────────────

interface StockRow {
  product_name: string; color: string | null; size: string; sku: string;
  stock_qty: number; stock_min: number; sold_30d: number;
  status: "ok" | "low" | "zero";
}

function TabEstoque() {
  const [data,   setData]   = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "low" | "zero">("all");
  const [fetched, setFetched] = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/reports/stock");
      if (r.ok) { const d = await r.json(); setData(d.stock_vs_sales ?? []); setFetched(true); }
    } finally { setLoading(false); }
  }, []);

  const filtered = data.filter((r) => filter === "all" || r.status === filter);

  const STATUS_BADGE: Record<string, string> = {
    ok:   "bg-green-100 text-green-700",
    low:  "bg-amber-100 text-amber-700",
    zero: "bg-red-100 text-red-600",
  };
  const STATUS_TEXT: Record<string, string> = { ok: "OK", low: "Baixo", zero: "Zero" };

  const lowCount  = data.filter((r) => r.status === "low").length;
  const zeroCount = data.filter((r) => r.status === "zero").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <LoadBtn loading={loading} onClick={fetch_}>Carregar Estoque</LoadBtn>
        {fetched && (
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {([
              { key: "all",  label: `Todos (${data.length})` },
              { key: "low",  label: `Alerta (${lowCount})` },
              { key: "zero", label: `Zerado (${zeroCount})` },
            ] as { key: typeof filter; label: string }[]).map(({ key, label }) => (
              <button key={key} onClick={() => setFilter(key)}
                className={cn("text-xs px-3 py-1.5 rounded-md transition-colors",
                  filter === key
                    ? "bg-white text-kc-dark shadow-sm font-medium"
                    : "text-gray-500 hover:text-gray-700")}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {!fetched ? (
        <EmptyState msg='Clique em "Carregar Estoque" para ver o relatório.' />
      ) : filtered.length === 0 ? (
        <EmptyState msg="Nenhuma variação encontrada." />
      ) : (
        <>
          {(lowCount > 0 || zeroCount > 0) && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-500 shrink-0" />
              <span className="text-sm text-amber-700">
                {zeroCount > 0 && `${zeroCount} variação(ões) sem estoque. `}
                {lowCount > 0 && `${lowCount} variação(ões) abaixo do mínimo.`}
              </span>
            </div>
          )}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {["Produto","Cor","Tamanho","SKU","Estoque","Vendido 30d","Status"].map((h) => (
                    <th key={h} className="text-left text-[11px] tracking-wider text-gray-500 uppercase px-4 py-2.5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 text-sm">
                    <td className="px-4 py-2.5 font-medium text-kc-dark">{r.product_name}</td>
                    <td className="px-4 py-2.5 text-gray-500">{r.color ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-2.5">
                      <span className="border border-gray-200 rounded text-xs font-medium text-gray-700 px-1.5 py-0.5">
                        {r.size}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{r.sku}</td>
                    <td className="px-4 py-2.5 font-semibold text-kc-dark">{r.stock_qty}</td>
                    <td className="px-4 py-2.5 text-gray-600">{r.sold_30d}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn("text-[9px] tracking-wider uppercase px-2 py-0.5 rounded-full font-medium",
                        STATUS_BADGE[r.status])}>
                        {STATUS_TEXT[r.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2 bg-gray-50 border-t text-xs text-gray-400 text-right">
              {filtered.length} variação{filtered.length !== 1 ? "ões" : ""}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Aba 4: Pagamentos ─────────────────────────────────────────────────────────

interface PaymentMethod { method: string; label: string; count: number; revenue: number; pct: number; }

function TabPagamentos() {
  const [start, setStart] = useState(monthStart());
  const [end,   setEnd]   = useState(today());
  const [data,  setData]  = useState<{ by_method: PaymentMethod[]; total_revenue: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/reports/payments?start_date=${start}&end_date=${end}`);
      if (r.ok) setData(await r.json());
    } finally { setLoading(false); }
  }, [start, end]);

  const pieData = data?.by_method.map((m) => ({ name: m.label, value: m.revenue })) ?? [];

  return (
    <div className="space-y-5">
      <DateFilters start={start} end={end} onStart={setStart} onEnd={setEnd}
        extra={<LoadBtn loading={loading} onClick={fetch_}>Buscar</LoadBtn>} />

      {!data ? (
        <EmptyState msg='Selecione o período e clique em "Buscar".' />
      ) : (
        <>
          {/* Cards por método */}
          <div className="grid grid-cols-3 gap-4">
            {["pix", "credit_card", "boleto"].map((method) => {
              const m = data.by_method.find((x) => x.method === method);
              return (
                <KpiCard key={method}
                  label={PAYMENT_LABEL[method] ?? method}
                  value={formatCurrency(m?.revenue ?? 0)}
                  sub={m ? `${m.count} pedido${m.count !== 1 ? "s" : ""} · ${m.pct}%` : "0 pedidos"} />
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pizza */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-[11px] tracking-wider text-gray-500 uppercase mb-4">Distribuição</p>
              {pieData.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Sem dados</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name"
                      cx="50%" cy="50%" outerRadius={80}
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      labelLine={false}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={KC_COLORS[i % KC_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Tabela detalhe */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <p className="text-[11px] tracking-wider text-gray-500 uppercase px-5 py-3 border-b border-gray-100">
                Detalhamento
              </p>
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {["Método","Pedidos","Receita","%"].map((h) => (
                      <th key={h} className="text-left text-[11px] tracking-wider text-gray-500 uppercase px-4 py-2.5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.by_method.map((m) => (
                    <tr key={m.method} className="border-b border-gray-100 hover:bg-gray-50 text-sm">
                      <td className="px-4 py-3 font-medium text-kc-dark">{m.label}</td>
                      <td className="px-4 py-3 text-gray-600">{m.count}</td>
                      <td className="px-4 py-3 font-medium text-kc-dark">{formatCurrency(m.revenue)}</td>
                      <td className="px-4 py-3 text-gray-500">{m.pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-2.5 border-t border-gray-100 flex justify-between text-sm font-medium text-kc-dark">
                <span>Total</span>
                <span>{formatCurrency(data.total_revenue)}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Aba 5: Clientes ───────────────────────────────────────────────────────────

interface CustomersReport {
  new_customers: number; returning_customers: number;
  top_customers: { name: string; email: string; orders: number; spent: number }[];
}

function TabClientes() {
  const [start, setStart] = useState(monthStart());
  const [end,   setEnd]   = useState(today());
  const [data,  setData]  = useState<CustomersReport | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/reports/customers?start_date=${start}&end_date=${end}`);
      if (r.ok) setData(await r.json());
    } finally { setLoading(false); }
  }, [start, end]);

  function doExport() {
    if (!data) return;
    exportToCsv("top-clientes", data.top_customers.map((c) => ({
      nome:   c.name,
      email:  c.email,
      pedidos: c.orders,
      total_gasto: c.spent,
    })));
  }

  return (
    <div className="space-y-5">
      <DateFilters start={start} end={end} onStart={setStart} onEnd={setEnd}
        extra={<LoadBtn loading={loading} onClick={fetch_}>Buscar</LoadBtn>} />

      {!data ? (
        <EmptyState msg='Selecione o período e clique em "Buscar".' />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <KpiCard label="Novos compradores" value={String(data.new_customers)}
              sub="Primeiro pedido no período" />
            <KpiCard label="Compradores recorrentes" value={String(data.returning_customers)}
              sub="Mais de 1 pedido no período" />
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <p className="font-serif text-base font-medium text-kc-dark">
                Top clientes por valor gasto
              </p>
              <button onClick={doExport}
                className="flex items-center gap-1.5 text-xs text-kc hover:text-kc-dark transition-colors">
                <Download size={13} /> Exportar CSV
              </button>
            </div>
            {data.top_customers.length === 0 ? (
              <p className="p-6 text-sm text-gray-400 text-center">Sem dados no período.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {["Nome","E-mail","Pedidos","Total Gasto"].map((h) => (
                      <th key={h} className="text-left text-[11px] tracking-wider text-gray-500 uppercase px-4 py-2.5">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.top_customers.map((c) => (
                    <tr key={c.email} className="border-b border-gray-100 hover:bg-gray-50 text-sm">
                      <td className="px-4 py-2.5 font-medium text-kc-dark">{c.name}</td>
                      <td className="px-4 py-2.5 text-gray-500">{c.email}</td>
                      <td className="px-4 py-2.5 text-center text-gray-700 font-medium">{c.orders}</td>
                      <td className="px-4 py-2.5 font-semibold text-kc-dark">{formatCurrency(c.spent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Página Principal ──────────────────────────────────────────────────────────

const TABS = [
  { key: "vendas",     label: "Vendas",       icon: TrendingUp },
  { key: "produtos",   label: "Produtos",     icon: Package },
  { key: "estoque",    label: "Estoque",      icon: BarChart3 },
  { key: "pagamentos", label: "Pagamentos",   icon: CreditCard },
  { key: "clientes",   label: "Clientes",     icon: Users },
] as const;

type TabKey = typeof TABS[number]["key"];

export default function RelatoriosPage() {
  const [active, setActive] = useState<TabKey>("vendas");

  return (
    <div>
      <h1 className="text-2xl font-serif font-medium text-kc-dark mb-6">Relatórios</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors",
              active === key
                ? "border-kc text-kc font-medium"
                : "border-transparent text-gray-500 hover:text-kc-dark"
            )}
          >
            <Icon size={15} strokeWidth={1.5} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {active === "vendas"     && <TabVendas />}
      {active === "produtos"   && <TabProdutos />}
      {active === "estoque"    && <TabEstoque />}
      {active === "pagamentos" && <TabPagamentos />}
      {active === "clientes"   && <TabClientes />}
    </div>
  );
}
