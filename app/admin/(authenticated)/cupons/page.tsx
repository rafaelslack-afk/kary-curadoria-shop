"use client";

import { useEffect, useState } from "react";
import { Tag, Plus, Pencil, X, Check } from "lucide-react";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

interface Coupon {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  min_order: number;
  max_uses: number | null;
  used_count: number;
  active: boolean;
  expires_at: string | null;
  created_at: string;
  is_floating: boolean;
  floating_title: string | null;
  floating_description: string | null;
}

const EMPTY_FORM = {
  code: "",
  type: "percent" as "percent" | "fixed",
  value: "",
  min_order: "",
  max_uses: "",
  expires_at: "",
  active: true,
  is_floating: false,
  floating_title: "",
  floating_description: "",
};

export default function CuponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { fetchCoupons(); }, []);

  async function fetchCoupons() {
    try {
      const res = await fetch("/api/admin/coupons");
      if (res.ok) setCoupons(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowForm(true);
  }

  function openEdit(c: Coupon) {
    setEditing(c);
    setForm({
      code: c.code,
      type: c.type,
      value: String(c.value),
      min_order: c.min_order ? String(c.min_order) : "",
      max_uses: c.max_uses ? String(c.max_uses) : "",
      expires_at: c.expires_at ? c.expires_at.slice(0, 10) : "",
      active: c.active,
      is_floating: c.is_floating ?? false,
      floating_title: c.floating_title ?? "",
      floating_description: c.floating_description ?? "",
    });
    setError("");
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.code || !form.value) {
      setError("Código e valor são obrigatórios.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        code: form.code.toUpperCase(),
        type: form.type,
        value: Number(form.value),
        min_order: form.min_order ? Number(form.min_order) : 0,
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        expires_at: form.expires_at || null,
        active: form.active,
        is_floating: form.is_floating,
        floating_title: form.is_floating ? form.floating_title : null,
        floating_description: form.is_floating ? form.floating_description : null,
      };

      const res = editing
        ? await fetch(`/api/admin/coupons/${editing.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/coupons", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Erro ao salvar.");
        return;
      }

      setShowForm(false);
      fetchCoupons();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(c: Coupon) {
    await fetch(`/api/admin/coupons/${c.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !c.active }),
    });
    setCoupons((prev) =>
      prev.map((x) => (x.id === c.id ? { ...x, active: !x.active } : x))
    );
  }

  const isExpired = (c: Coupon) =>
    c.expires_at ? new Date(c.expires_at) < new Date() : false;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif font-medium text-kc-dark">Cupons</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-kc text-white text-[11px] tracking-[0.14em] uppercase px-4 py-2.5 hover:bg-kc-dark transition-colors"
        >
          <Plus size={14} />
          Novo Cupom
        </button>
      </div>

      {/* Formulário inline */}
      {showForm && (
        <div className="bg-white border border-kc-line rounded-lg p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg font-medium text-kc-dark">
              {editing ? "Editar Cupom" : "Novo Cupom"}
            </h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Código */}
            <div>
              <label className="block text-[11px] tracking-wider text-gray-500 uppercase mb-1.5">
                Código *
              </label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="EX: PROMO10"
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:border-kc"
              />
            </div>

            {/* Tipo */}
            <div>
              <label className="block text-[11px] tracking-wider text-gray-500 uppercase mb-1.5">
                Tipo *
              </label>
              <div className="flex gap-2">
                {(["percent", "fixed"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, type: t })}
                    className={cn(
                      "flex-1 py-2 text-xs rounded border transition-colors",
                      form.type === t
                        ? t === "percent"
                          ? "bg-blue-50 border-blue-400 text-blue-700 font-medium"
                          : "bg-green-50 border-green-400 text-green-700 font-medium"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    )}
                  >
                    {t === "percent" ? "% Percentual" : "R$ Valor fixo"}
                  </button>
                ))}
              </div>
            </div>

            {/* Valor */}
            <div>
              <label className="block text-[11px] tracking-wider text-gray-500 uppercase mb-1.5">
                Valor do Desconto *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  {form.type === "percent" ? "%" : "R$"}
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  className="w-full border border-gray-200 rounded pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-kc"
                />
              </div>
            </div>

            {/* Pedido mínimo */}
            <div>
              <label className="block text-[11px] tracking-wider text-gray-500 uppercase mb-1.5">
                Pedido Mínimo (opcional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.min_order}
                  onChange={(e) => setForm({ ...form, min_order: e.target.value })}
                  placeholder="0"
                  className="w-full border border-gray-200 rounded pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-kc"
                />
              </div>
            </div>

            {/* Limite de usos */}
            <div>
              <label className="block text-[11px] tracking-wider text-gray-500 uppercase mb-1.5">
                Limite de Usos (vazio = ilimitado)
              </label>
              <input
                type="number"
                min="1"
                value={form.max_uses}
                onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                placeholder="Ilimitado"
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-kc"
              />
            </div>

            {/* Expiração */}
            <div>
              <label className="block text-[11px] tracking-wider text-gray-500 uppercase mb-1.5">
                Expira em (opcional)
              </label>
              <input
                type="date"
                value={form.expires_at}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-kc"
              />
            </div>
          </div>

          {/* Ativo toggle */}
          <div className="flex items-center gap-3 mt-4">
            <button
              type="button"
              onClick={() => setForm({ ...form, active: !form.active })}
              className={cn(
                "relative w-10 h-5 rounded-full transition-colors",
                form.active ? "bg-kc" : "bg-gray-300"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                  form.active ? "left-5" : "left-0.5"
                )}
              />
            </button>
            <span className="text-sm text-gray-600">
              {form.active ? "Ativo" : "Inativo"}
            </span>
          </div>

          {/* ── Cupom Flutuante ── */}
          <div className="mt-5 pt-5 border-t border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-gray-700">Cupom Flutuante</p>
                <p className="text-xs text-gray-400">Exibe um card lateral animado na loja para promover este cupom</p>
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, is_floating: !form.is_floating })}
                className={cn(
                  "relative w-10 h-5 rounded-full transition-colors shrink-0",
                  form.is_floating ? "bg-[#A0622A]" : "bg-gray-300"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                    form.is_floating ? "left-5" : "left-0.5"
                  )}
                />
              </button>
            </div>

            {/* Aviso se outro cupom já é flutuante */}
            {form.is_floating && coupons.some((c) => c.is_floating && c.id !== editing?.id) && (
              <div className="mb-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded px-3 py-2 text-sm text-amber-800">
                <span className="mt-0.5">⚠️</span>
                <span>
                  O cupom{" "}
                  <strong>{coupons.find((c) => c.is_floating && c.id !== editing?.id)?.code}</strong>{" "}
                  já está configurado como flutuante. Ativar este irá desativar o anterior.
                </span>
              </div>
            )}

            {form.is_floating && (
              <div className="grid grid-cols-1 gap-3 mt-2">
                <div>
                  <label className="block text-[11px] tracking-wider text-gray-500 uppercase mb-1.5">
                    Título do cupom
                  </label>
                  <input
                    type="text"
                    value={form.floating_title}
                    onChange={(e) => setForm({ ...form, floating_title: e.target.value })}
                    placeholder="🎉 Oferta Especial!"
                    maxLength={100}
                    className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-kc"
                  />
                </div>
                <div>
                  <label className="block text-[11px] tracking-wider text-gray-500 uppercase mb-1.5">
                    Instrução breve
                  </label>
                  <input
                    type="text"
                    value={form.floating_description}
                    onChange={(e) => setForm({ ...form, floating_description: e.target.value })}
                    placeholder="Aplique no carrinho e ganhe 15% OFF"
                    maxLength={200}
                    className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-kc"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">{form.floating_description.length}/200</p>
                </div>
              </div>
            )}
          </div>

          {error && (
            <p className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>
          )}

          <div className="flex gap-3 mt-5">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-kc text-white text-[11px] tracking-[0.14em] uppercase px-5 py-2.5 hover:bg-kc-dark transition-colors disabled:opacity-60"
            >
              <Check size={14} />
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-[11px] tracking-[0.14em] uppercase px-5 py-2.5 border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Tabela */}
      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400">
          Carregando...
        </div>
      ) : coupons.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Tag size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 mb-4">Nenhum cupom cadastrado ainda.</p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 bg-kc text-white text-[11px] tracking-[0.14em] uppercase px-5 py-2.5 hover:bg-kc-dark transition-colors"
          >
            <Plus size={14} />
            Criar primeiro cupom
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["Código", "Tipo", "Desconto", "Pedido Mínimo", "Usos", "Validade", "Status", "Ações"].map((h) => (
                  <th
                    key={h}
                    className="text-left text-[11px] tracking-wider text-gray-500 uppercase px-4 py-3"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => {
                const expired = isExpired(c);
                return (
                  <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-sm font-medium text-kc-dark">{c.code}</span>
                        {c.is_floating && (
                          <span title="Cupom flutuante ativo" className="text-[11px]">🏷️</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full font-medium",
                          c.type === "percent"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-green-100 text-green-700"
                        )}
                      >
                        {c.type === "percent" ? "%" : "R$"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-kc-dark font-medium">
                      {c.type === "percent"
                        ? `${c.value}%`
                        : formatCurrency(c.value)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {c.min_order > 0 ? formatCurrency(c.min_order) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {c.used_count}
                      {c.max_uses != null && (
                        <span className="text-gray-400 text-xs"> / {c.max_uses}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {c.expires_at ? (
                        <span className={expired ? "text-red-500" : "text-gray-600"}>
                          {formatDate(c.expires_at)}
                          {expired && <span className="ml-1 text-[9px] uppercase tracking-wide">(vencido)</span>}
                        </span>
                      ) : (
                        <span className="text-gray-300">Sem limite</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(c)}
                        className={cn(
                          "relative w-10 h-5 rounded-full transition-colors",
                          c.active && !expired ? "bg-kc" : "bg-gray-300"
                        )}
                        title={c.active ? "Desativar" : "Ativar"}
                      >
                        <span
                          className={cn(
                            "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                            c.active ? "left-5" : "left-0.5"
                          )}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEdit(c)}
                        className="text-kc-muted hover:text-kc transition-colors"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-400 text-right">
            {coupons.length} cupom{coupons.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
