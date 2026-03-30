"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, X, Check, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Size } from "@/types/database";

interface FormState {
  name: string;
  order_index: string;
  active: boolean;
}

const EMPTY_FORM: FormState = { name: "", order_index: "0", active: true };

export default function TamanhosPage() {
  const [sizes, setSizes] = useState<Size[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSizes();
  }, []);

  async function fetchSizes() {
    try {
      const res = await fetch("/api/admin/sizes");
      if (res.ok) setSizes(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  function startEdit(size: Size) {
    setEditingId(size.id);
    setForm({ name: size.name, order_index: String(size.order_index), active: size.active });
    setShowNew(false);
    setError("");
  }

  function startNew() {
    setShowNew(true);
    setEditingId(null);
    const nextOrder = sizes.length > 0 ? Math.max(...sizes.map((s) => s.order_index)) + 1 : 0;
    setForm({ ...EMPTY_FORM, order_index: String(nextOrder) });
    setError("");
  }

  function cancelForm() {
    setShowNew(false);
    setEditingId(null);
    setError("");
  }

  async function saveSize() {
    if (!form.name.trim()) {
      setError("Nome é obrigatório.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const isNew = !editingId;
      const payload = {
        name: form.name.trim(),
        order_index: parseInt(form.order_index) || 0,
        active: form.active,
      };
      const res = await fetch("/api/admin/sizes", {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isNew ? payload : { id: editingId, ...payload }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Erro ao salvar.");
        return;
      }
      await fetchSizes();
      cancelForm();
    } catch {
      setError("Erro de conexão.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif font-medium text-kc-dark">Tamanhos</h1>
        {!showNew && !editingId && (
          <Button size="sm" onClick={startNew}>
            <Plus size={14} className="mr-1.5" />
            Novo Tamanho
          </Button>
        )}
      </div>

      {/* Formulário inline */}
      {(showNew || editingId) && (
        <div className="bg-white rounded-lg border border-kc/30 p-5 mb-6 max-w-md">
          <h2 className="font-serif text-base font-medium text-kc-dark mb-4">
            {showNew ? "Novo Tamanho" : "Editar Tamanho"}
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[11px] tracking-wider text-gray-500 uppercase mb-1.5">
                Nome *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: M, G, Único"
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-kc"
              />
            </div>
            <div>
              <label className="block text-[11px] tracking-wider text-gray-500 uppercase mb-1.5">
                Ordem
              </label>
              <input
                type="number"
                min="0"
                value={form.order_index}
                onChange={(e) => setForm((f) => ({ ...f, order_index: e.target.value }))}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-kc"
              />
              <p className="text-[9px] text-gray-400 mt-0.5">Menor = primeiro na listagem</p>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              className="w-4 h-4 accent-kc"
            />
            Ativo
          </label>

          {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

          <div className="flex gap-2">
            <Button size="sm" onClick={saveSize} loading={saving}>
              <Check size={13} className="mr-1" />
              Salvar
            </Button>
            <Button size="sm" variant="ghost" onClick={cancelForm}>
              <X size={13} className="mr-1" />
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Listagem */}
      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400">
          Carregando...
        </div>
      ) : sizes.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <Ruler size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Nenhum tamanho cadastrado ainda.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left text-[11px] tracking-wider text-gray-500 uppercase px-4 py-3">
                  Nome
                </th>
                <th className="text-left text-[11px] tracking-wider text-gray-500 uppercase px-4 py-3">
                  Ordem
                </th>
                <th className="text-center text-[11px] tracking-wider text-gray-500 uppercase px-4 py-3">
                  Status
                </th>
                <th className="px-4 py-3 w-12" />
              </tr>
            </thead>
            <tbody>
              {sizes.map((size) => (
                <tr key={size.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="inline-block border border-gray-300 rounded text-sm font-medium text-gray-800 px-2.5 py-0.5">
                      {size.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{size.order_index}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={cn(
                        "inline-block text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full",
                        size.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      )}
                    >
                      {size.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => startEdit(size)}
                      className="p-1.5 text-gray-400 hover:text-kc transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
