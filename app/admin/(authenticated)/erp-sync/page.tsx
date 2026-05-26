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
  Wrench,
  X,
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

interface ExistingVariant {
  sku: string;
  color: string | null;
  size: string | null;
  stock_qty: number;
  active: boolean;
}

interface VariantWarning {
  type: "not_found" | "inactive";
  sku: string;
  variant_id?: string;
  existing: ExistingVariant[];
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

// ── Modal de Corrigir Mapeamento ───────────────────────────────────────────────

interface MappingModalProps {
  errorItem: SyncError;
  onClose: () => void;
  onSuccess: () => void;
}

function MappingModal({ errorItem, onClose, onSuccess }: MappingModalProps) {
  const [skuCode, setSkuCode]             = useState("");
  const [saving, setSaving]               = useState(false);
  const [warning, setWarning]             = useState<VariantWarning | null>(null);
  const [successMsg, setSuccessMsg]       = useState<string | null>(null);

  // Pré-preencher com o fragmento de cor do SKU tentado, se disponível
  // ex: "CON-0006-OLIVA-M" → "OLIVA"
  useEffect(() => {
    if (errorItem.sku_tentado && errorItem.product_code && errorItem.size) {
      const prefix = `${errorItem.product_code}-`;
      const suffix = `-${errorItem.size}`;
      const raw    = errorItem.sku_tentado;
      if (raw.startsWith(prefix) && raw.endsWith(suffix)) {
        setSkuCode(raw.slice(prefix.length, raw.length - suffix.length));
      }
    }
  }, [errorItem]);

  async function handleSave() {
    if (!skuCode.trim()) return;
    setSaving(true);
    setWarning(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/admin/erp-sync/mapping", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          erp_color:    errorItem.color_erp,
          sku_code:     skuCode.trim().toUpperCase(),
          product_code: errorItem.product_code,
          size:         errorItem.size,
          error_id:     errorItem.id,
        }),
      });

      const data = await res.json() as {
        success?: boolean;
        message?: string;
        error?: string;
        sku_checked?: string;
        existing_variants?: ExistingVariant[];
        variant_id?: string;
        stock_qty?: number;
      };

      if (res.status === 404 && data.error === "variant_not_found") {
        setWarning({
          type:     "not_found",
          sku:      data.sku_checked ?? "",
          existing: data.existing_variants ?? [],
        });
        return;
      }

      if (res.status === 400 && data.error === "variant_inactive") {
        setWarning({
          type:       "inactive",
          sku:        data.sku_checked ?? "",
          variant_id: data.variant_id,
          existing:   [],
        });
        return;
      }

      if (!res.ok) {
        setWarning({ type: "not_found", sku: "", existing: [] });
        return;
      }

      // Sucesso
      setSuccessMsg(data.message ?? "Mapeamento salvo com sucesso.");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Wrench size={16} className="text-kc-muted" strokeWidth={1.5} />
            <h2 className="font-serif text-base font-medium text-kc-dark">
              Corrigir Mapeamento de Cor
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Corpo */}
        <div className="px-6 py-5 space-y-4">

          {/* Dados do erro (somente leitura) */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-gray-500 uppercase tracking-wide mb-1">
                Produto ERP
              </label>
              <p className="text-sm font-mono font-medium text-kc-dark bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5">
                {errorItem.product_code ?? "—"}
              </p>
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 uppercase tracking-wide mb-1">
                Cor ERP
              </label>
              <p className="text-sm text-kc-dark bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5">
                {errorItem.color_erp ?? "—"}
              </p>
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 uppercase tracking-wide mb-1">
                Tamanho
              </label>
              <p className="text-sm font-mono text-kc-dark bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5">
                {errorItem.size ?? "—"}
              </p>
            </div>
          </div>

          {/* Código SKU editável */}
          <div>
            <label className="block text-[11px] text-gray-500 uppercase tracking-wide mb-1">
              Código de Cor KVO{" "}
              <span className="normal-case tracking-normal text-gray-400">(ex: OLIVA, VERDE, PRETO)</span>
            </label>
            <input
              type="text"
              value={skuCode}
              onChange={(e) => {
                setSkuCode(e.target.value.toUpperCase());
                setWarning(null);
              }}
              placeholder="Ex: OLIVA"
              className="w-full font-mono text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:border-kc uppercase"
            />
            {skuCode && errorItem.product_code && errorItem.size && (
              <p className="text-[11px] text-gray-400 mt-1">
                SKU que será verificado:{" "}
                <span className="font-mono text-gray-600">
                  {errorItem.product_code}-{skuCode}-{errorItem.size}
                </span>
              </p>
            )}
          </div>

          {/* Aviso: variante não encontrada */}
          {warning?.type === "not_found" && (
            <div className="bg-[#FFF3CD] border border-[#f59e0b] border-l-4 border-l-[#f59e0b] rounded-r-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle size={15} className="text-[#856404] mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#856404]">
                    Variante não encontrada no KVO
                  </p>
                  <p className="text-xs text-[#856404] mt-1">
                    O SKU{" "}
                    <strong className="font-mono">{warning.sku}</strong>{" "}
                    não existe no KVO. Cadastre esta variante no painel de
                    produtos antes de criar o mapeamento.
                  </p>
                </div>
              </div>

              {warning.existing.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-[#856404] mb-2">
                    Variantes cadastradas para este produto no KVO:
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                    {warning.existing.map((v) => (
                      <span
                        key={v.sku}
                        className={cn(
                          "text-[11px] font-mono border rounded px-2 py-0.5",
                          v.active
                            ? "bg-white border-[#f59e0b] text-[#856404]"
                            : "bg-gray-50 border-gray-300 text-gray-400 line-through"
                        )}
                        title={v.active ? `${v.stock_qty} un. em estoque` : "Inativa"}
                      >
                        {v.sku}
                        <span className="ml-1 not-italic text-gray-500">
                          ({v.stock_qty} un.)
                        </span>
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-[#856404] mt-2">
                    💡 Verifique se o código de cor informado está correto ou
                    se a variante precisa ser cadastrada no KVO primeiro.
                  </p>
                </div>
              )}

              <a
                href={`/admin/produtos?search=${errorItem.product_code ?? ""}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-[#A0622A] underline"
              >
                <ExternalLink size={11} />
                Ir para cadastro do produto no KVO →
              </a>
            </div>
          )}

          {/* Aviso: variante inativa */}
          {warning?.type === "inactive" && (
            <div className="bg-[#FFF3CD] border border-[#f59e0b] border-l-4 border-l-[#f59e0b] rounded-r-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle size={15} className="text-[#856404] mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-[#856404]">
                    Variante inativa no KVO
                  </p>
                  <p className="text-xs text-[#856404] mt-1">
                    A variante{" "}
                    <strong className="font-mono">{warning.sku}</strong>{" "}
                    existe no KVO mas está inativa. Ative-a antes de criar
                    o mapeamento.
                  </p>
                  <a
                    href={`/admin/produtos?search=${errorItem.product_code ?? ""}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-[#A0622A] underline"
                  >
                    <ExternalLink size={11} />
                    Ativar variante no KVO →
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Sucesso */}
          {successMsg && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <CheckCircle2 size={15} className="text-green-600 shrink-0" />
              <p className="text-sm text-green-800">{successMsg}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            disabled={saving}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors px-4 py-2"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !skuCode.trim() || !!successMsg}
            className="flex items-center gap-2 text-sm bg-kc hover:bg-kc/90 disabled:opacity-50 text-white px-5 py-2 rounded-md transition-colors"
          >
            {saving ? (
              <><RefreshCw size={13} className="animate-spin" /> Validando…</>
            ) : (
              <><Wrench size={13} /> Validar e salvar mapeamento</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
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
  const [mappingItem, setMappingItem] = useState<SyncError | null>(null);

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

    if (pending.status    === "fulfilled") setPendingCount(pending.value.count ?? 0);
    if (resolved.status   === "fulfilled") setResolvedCount(resolved.value.total ?? 0);
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

  // ── Resolver em massa ─────────────────────────────────────────────────────────

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

  // ── Callbacks do modal ────────────────────────────────────────────────────────

  async function handleMappingSuccess() {
    await fetchErrors();
    await fetchSummary();
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const syncOk = hoursSince !== null && hoursSince <= 4;

  return (
    <div>
      {/* Modal de mapeamento */}
      {mappingItem && (
        <MappingModal
          errorItem={mappingItem}
          onClose={() => setMappingItem(null)}
          onSuccess={handleMappingSuccess}
        />
      )}

      <div className="flex items-center gap-3 mb-6">
        <RefreshCw size={22} className="text-kc-muted" strokeWidth={1.5} />
        <h1 className="text-2xl font-serif font-medium text-kc-dark">Sync ERP — Monitoramento</h1>
      </div>

      {/* ── Cards de resumo ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

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

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-gray-500 uppercase tracking-wide">Resolvidos (total)</span>
            <CheckCircle2 size={16} className="text-green-500" />
          </div>
          <p className="text-2xl font-medium text-kc-dark">{resolvedCount ?? "—"}</p>
        </div>

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

      {/* ── Tabela ──────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
          {/* Filtros de status */}
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

            {selected.size > 0 && (
              <button
                onClick={resolveSelected}
                disabled={resolving}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-md transition-colors whitespace-nowrap"
              >
                <CheckCheck size={13} />
                {resolving ? "Salvando…" : `Resolver (${selected.size})`}
              </button>
            )}
          </div>
        </div>

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
                          {err.notes && (
                            <p className="text-[10px] text-gray-400 mt-0.5 max-w-[180px] truncate" title={err.notes}>
                              {err.notes}
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
                        <div className="flex items-center gap-3">
                          {/* Corrigir mapeamento */}
                          {err.error_type === "not_found" && (
                            <button
                              onClick={() => setMappingItem(err)}
                              className="flex items-center gap-1 text-[11px] text-kc hover:underline whitespace-nowrap"
                            >
                              <Wrench size={11} />
                              Corrigir
                            </button>
                          )}
                          {/* Marcar resolvido manualmente */}
                          <button
                            onClick={async () => {
                              await fetch("/api/admin/erp-sync-errors", {
                                method:  "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body:    JSON.stringify({ ids: [err.id] }),
                              });
                              await fetchErrors();
                              await fetchSummary();
                            }}
                            className="text-[11px] text-green-600 hover:underline whitespace-nowrap"
                          >
                            Resolver
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                {total} registro{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
              </p>
              {selected.size > 0 && (
                <p className="text-xs text-kc font-medium">
                  {selected.size} selecionado{selected.size > 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Nota informativa ────────────────────────────────────────────────── */}
      <div className="mt-6 bg-blue-50 border border-blue-100 rounded-lg px-5 py-4">
        <p className="text-xs font-semibold text-blue-800 mb-1">Como corrigir um erro de sincronização</p>
        <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
          <li>Clique em <strong>Corrigir</strong> na linha do erro para abrir o modal de mapeamento.</li>
          <li>Informe o código de cor KVO correto (ex: OLIVA) — o sistema validará a variante antes de salvar.</li>
          <li>Se a variante não existir, cadastre-a no painel de produtos e tente novamente.</li>
          <li>Após salvar, o mapeamento é aplicado automaticamente nas próximas sincronizações do ERP.</li>
          <li>Para mapeamentos permanentes, adicione também em <code className="bg-blue-100 px-1 rounded">COLOR_TO_SKU</code> no código.</li>
        </ol>
      </div>
    </div>
  );
}
