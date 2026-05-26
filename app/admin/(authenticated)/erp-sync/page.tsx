"use client";

import { useEffect, useState, useCallback } from "react";
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  CheckCheck,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface SyncError {
  id: string;
  product_code: string | null;
  color_erp: string | null;
  size: string | null;
  sku_tentado: string | null;
  quantity: number | null;
  error_type: string;
  resolved: boolean;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  notes: string | null;
}

type StatusFilter = "pending" | "resolved" | "all";

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day:    "2-digit",
    month:  "2-digit",
    year:   "2-digit",
    hour:   "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function ErpSyncPage() {
  const [errors, setErrors]       = useState<SyncError[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [statusFilter, setStatus] = useState<StatusFilter>("pending");
  const [search, setSearch]       = useState("");
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [resolving, setResolving] = useState(false);

  // Totais para os cards de resumo
  const [pendingCount, setPendingCount]   = useState<number | null>(null);
  const [resolvedCount, setResolvedCount] = useState<number | null>(null);
  const [lastSync, setLastSync]           = useState<string | null>(null);
  const [hoursSince, setHoursSince]       = useState<number | null>(null);

  // ── Busca de dados ────────────────────────────────────────────────────────────

  const fetchErrors = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        limit:  "100",
        offset: "0",
      });
      if (search) params.set("search", search);

      const res  = await fetch(`/api/admin/erp-sync-errors?${params}`);
      const data = await res.json() as { data: SyncError[]; total: number };
      setErrors(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  const fetchSummary = useCallback(async () => {
    const [pending, resolved, syncStatus] = await Promise.allSettled([
      fetch("/api/admin/erp-sync-errors/count").then((r) => r.json()),
      fetch("/api/admin/erp-sync-errors?status=resolved&limit=1").then((r) => r.json()),
      fetch("/api/admin/erp-sync-status").then((r) => r.json()),
    ]);

    if (pending.status  === "fulfilled") setPendingCount(pending.value.count ?? 0);
    if (resolved.status === "fulfilled") setResolvedCount(resolved.value.total ?? 0);
    if (syncStatus.status === "fulfilled") {
      setLastSync(syncStatus.value.lastSync ?? null);
      setHoursSince(syncStatus.value.hoursSince ?? null);
    }
  }, []);

  useEffect(() => { fetchErrors(); }, [fetchErrors]);
  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  // ── Seleção ───────────────────────────────────────────────────────────────────

  function toggleAll() {
    if (selected.size === errors.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(errors.map((e) => e.id)));
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  // ── Resolver erros selecionados ───────────────────────────────────────────────

  async function resolveSelected() {
    if (selected.size === 0) return;
    setResolving(true);
    try {
      const res = await fetch("/api/admin/erp-sync-errors", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ids: Array.from(selected) }),
      });
      if (res.ok) {
        await fetchErrors();
        await fetchSummary();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setResolving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const syncOk = hoursSince !== null && hoursSince <= 4;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <RefreshCw size={22} className="text-kc-muted" strokeWidth={1.5} />
        <h1 className="text-2xl font-serif font-medium text-kc-dark">Sync ERP — Monitoramento</h1>
      </div>

      {/* ── Cards de resumo ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

        {/* Erros pendentes */}
        <div className={cn(
          "bg-white rounded-lg border p-4",
          (pendingCount ?? 0) > 0 ? "border-red-300" : "border-gray-200"
        )}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-gray-500 uppercase tracking-wide">Erros Pendentes</span>
            <AlertTriangle size={16} className={(pendingCount ?? 0) > 0 ? "text-red-500" : "text-gray-300"} />
          </div>
          <p className={cn(
            "text-2xl font-medium",
            (pendingCount ?? 0) > 0 ? "text-red-600" : "text-gray-400"
          )}>
            {pendingCount ?? "—"}
          </p>
        </div>

        {/* Última sync */}
        <div className={cn(
          "bg-white rounded-lg border p-4",
          syncOk ? "border-gray-200" : "border-amber-300"
        )}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-gray-500 uppercase tracking-wide">Última Sync</span>
            <Clock size={16} className={syncOk ? "text-green-500" : "text-amber-500"} />
          </div>
          <p className="text-sm font-medium text-kc-dark truncate">
            {lastSync ? formatDate(lastSync) : "Nunca"}
          </p>
          {hoursSince !== null && (
            <p className={cn(
              "text-[11px] mt-0.5",
              syncOk ? "text-green-600" : "text-amber-600"
            )}>
              há {Math.floor(hoursSince)}h
            </p>
          )}
        </div>

        {/* Resolvidos */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-gray-500 uppercase tracking-wide">Resolvidos (total)</span>
            <CheckCircle2 size={16} className="text-green-500" />
          </div>
          <p className="text-2xl font-medium text-kc-dark">{resolvedCount ?? "—"}</p>
        </div>

        {/* Status da sync */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-gray-500 uppercase tracking-wide">Status</span>
            <RefreshCw size={16} className={syncOk ? "text-green-500" : "text-amber-500"} />
          </div>
          <p className={cn(
            "text-sm font-medium",
            syncOk ? "text-green-600" : "text-amber-600"
          )}>
            {hoursSince === null ? "Sem dados" : syncOk ? "Atualizado" : "Desatualizado"}
          </p>
        </div>
      </div>

      {/* ── Filtros e busca ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div className="flex gap-1">
            {(["pending", "resolved", "all"] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-md border transition-colors",
                  statusFilter === s
                    ? "bg-kc text-white border-kc"
                    : "border-gray-200 text-gray-500 hover:border-kc hover:text-kc"
                )}
              >
                {s === "pending" ? "Pendentes" : s === "resolved" ? "Resolvidos" : "Todos"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Buscador */}
            <div className="relative flex-1 sm:w-60">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Produto, cor ou SKU…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-kc"
              />
            </div>

            {/* Resolver selecionados */}
            {selected.size > 0 && (
              <button
                onClick={resolveSelected}
                disabled={resolving}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-md transition-colors"
              >
                <CheckCheck size={13} />
                {resolving ? "Salvando…" : `Resolver (${selected.size})`}
              </button>
            )}
          </div>
        </div>

        {/* ── Tabela ──────────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Carregando…</div>
        ) : errors.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 size={36} className="mx-auto text-green-300 mb-3" />
            <p className="text-sm text-gray-500">
              {statusFilter === "pending"
                ? "Nenhum erro pendente. Tudo sincronizado!"
                : "Nenhum registro encontrado."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left">
                    <input
                      type="checkbox"
                      checked={selected.size === errors.length && errors.length > 0}
                      onChange={toggleAll}
                      className="accent-kc"
                    />
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] text-gray-500 uppercase tracking-wide whitespace-nowrap">Data</th>
                  <th className="px-4 py-2.5 text-left text-[11px] text-gray-500 uppercase tracking-wide whitespace-nowrap">Produto</th>
                  <th className="px-4 py-2.5 text-left text-[11px] text-gray-500 uppercase tracking-wide">Cor ERP</th>
                  <th className="px-4 py-2.5 text-left text-[11px] text-gray-500 uppercase tracking-wide">Tam.</th>
                  <th className="px-4 py-2.5 text-left text-[11px] text-gray-500 uppercase tracking-wide whitespace-nowrap">SKU Tentado</th>
                  <th className="px-4 py-2.5 text-center text-[11px] text-gray-500 uppercase tracking-wide">Qtd</th>
                  <th className="px-4 py-2.5 text-left text-[11px] text-gray-500 uppercase tracking-wide">Tipo</th>
                  <th className="px-4 py-2.5 text-left text-[11px] text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-left text-[11px] text-gray-500 uppercase tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((err) => (
                  <tr
                    key={err.id}
                    className={cn(
                      "border-t border-gray-50 hover:bg-gray-50/60 transition-colors",
                      selected.has(err.id) && "bg-blue-50/40"
                    )}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(err.id)}
                        onChange={() => toggleOne(err.id)}
                        className="accent-kc"
                      />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(err.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-medium text-kc-dark">
                          {err.product_code ?? "—"}
                        </span>
                        {err.product_code && (
                          <a
                            href={`/admin/produtos?search=${err.product_code}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Ver produto"
                            className="text-gray-400 hover:text-kc transition-colors"
                          >
                            <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">
                      {err.color_erp ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">
                      {err.size ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {err.sku_tentado ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-gray-600">
                      {err.quantity ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] tracking-wide uppercase bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                        {err.error_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {err.resolved ? (
                        <div>
                          <span className="text-[10px] tracking-wide uppercase bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            Resolvido
                          </span>
                          {err.resolved_at && (
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {formatDate(err.resolved_at)}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] tracking-wide uppercase bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                          Pendente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {!err.resolved && (
                        <button
                          onClick={async () => {
                            setSelected(new Set([err.id]));
                            await fetch("/api/admin/erp-sync-errors", {
                              method:  "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body:    JSON.stringify({ ids: [err.id] }),
                            });
                            await fetchErrors();
                            await fetchSummary();
                          }}
                          className="text-[11px] text-green-600 hover:underline"
                        >
                          Resolver
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Rodapé com total */}
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                {total} registro{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
              </p>
              {selected.size > 0 && (
                <p className="text-xs text-kc font-medium">{selected.size} selecionado{selected.size > 1 ? "s" : ""}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Nota informativa ────────────────────────────────────────────────── */}
      <div className="mt-6 bg-blue-50 border border-blue-100 rounded-lg px-5 py-4">
        <p className="text-xs font-semibold text-blue-800 mb-1">Como corrigir um erro de sincronização</p>
        <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
          <li>Identifique a cor ERP que não foi mapeada (ex.: &quot;Verde Musgo&quot;).</li>
          <li>Acesse o produto no admin e verifique o SKU correto da variante.</li>
          <li>No arquivo <code className="bg-blue-100 px-1 rounded">app/api/stock/sync/route.ts</code>, adicione a entrada em <code className="bg-blue-100 px-1 rounded">COLOR_TO_SKU</code>.</li>
          <li>Faça deploy e solicite ao ERP uma nova sincronização para o produto.</li>
          <li>Marque o(s) erro(s) como resolvido(s) aqui.</li>
        </ol>
      </div>
    </div>
  );
}
