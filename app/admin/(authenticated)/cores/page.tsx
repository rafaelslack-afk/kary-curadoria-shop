"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, X, Check, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Color } from "@/types/database";

interface FormState {
  name: string;
  hex_code: string;
  active: boolean;
}

const EMPTY_FORM: FormState = { name: "", hex_code: "#000000", active: true };

export default function CoresPage() {
  const [colors, setColors] = useState<Color[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchColors();
  }, []);

  async function fetchColors() {
    try {
      const res = await fetch("/api/admin/colors");
      if (res.ok) setColors(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  function startEdit(color: Color) {
    setEditingId(color.id);
    setForm({ name: color.name, hex_code: color.hex_code, active: color.active });
    setShowNew(false);
    setError("");
  }

  function startNew() {
    setShowNew(true);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
  }

  function cancelForm() {
    setShowNew(false);
    setEditingId(null);
    setError("");
  }

  async function saveColor() {
    if (!form.name.trim() || !form.hex_code.trim()) {
      setError("Nome e cor são obrigatórios.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const isNew = !editingId;
      const res = await fetch("/api/admin/colors", {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isNew ? form : { id: editingId, ...form }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Erro ao salvar.");
        return;
      }
      await fetchColors();
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
        <h1 className="text-2xl font-serif font-medium text-kc-dark">Cores</h1>
        {!showNew && !editingId && (
          <Button size="sm" onClick={startNew}>
            <Plus size={14} className="mr-1.5" />
            Nova Cor
          </Button>
        )}
      </div>

      {/* Formulário inline */}
      {(showNew || editingId) && (
        <div className="bg-white rounded-lg border border-kc/30 p-5 mb-6 max-w-lg">
          <h2 className="font-serif text-base font-medium text-kc-dark mb-4">
            {showNew ? "Nova Cor" : "Editar Cor"}
          </h2>
          <div className="flex gap-4 items-start mb-4">
            {/* Color preview */}
            <div
              className="w-10 h-10 rounded-full border border-gray-200 shrink-0 mt-6"
              style={{ backgroundColor: form.hex_code }}
            />
            <div className="flex-1 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] tracking-wider text-gray-500 uppercase mb-1.5">
                  Nome *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Branco Off-White"
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-kc"
                />
              </div>
              <div>
                <label className="block text-[11px] tracking-wider text-gray-500 uppercase mb-1.5">
                  Cor (hex) *
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={form.hex_code}
                    onChange={(e) => setForm((f) => ({ ...f, hex_code: e.target.value }))}
                    className="w-10 h-9 rounded border border-gray-200 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={form.hex_code}
                    onChange={(e) => setForm((f) => ({ ...f, hex_code: e.target.value }))}
                    placeholder="#A0622A"
                    className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-kc"
                  />
                </div>
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              className="w-4 h-4 accent-kc"
            />
            Ativa
          </label>

          {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

          <div className="flex gap-2">
            <Button size="sm" onClick={saveColor} loading={saving}>
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
      ) : colors.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <Palette size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Nenhuma cor cadastrada ainda.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left text-[11px] tracking-wider text-gray-500 uppercase px-4 py-3 w-14">
                  Cor
                </th>
                <th className="text-left text-[11px] tracking-wider text-gray-500 uppercase px-4 py-3">
                  Nome
                </th>
                <th className="text-left text-[11px] tracking-wider text-gray-500 uppercase px-4 py-3">
                  Hex
                </th>
                <th className="text-center text-[11px] tracking-wider text-gray-500 uppercase px-4 py-3">
                  Status
                </th>
                <th className="px-4 py-3 w-12" />
              </tr>
            </thead>
            <tbody>
              {colors.map((color) => (
                <tr key={color.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div
                      className="w-8 h-8 rounded-full border border-gray-200"
                      style={{ backgroundColor: color.hex_code }}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{color.name}</td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-500">{color.hex_code}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={cn(
                        "inline-block text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full",
                        color.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      )}
                    >
                      {color.active ? "Ativa" : "Inativa"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => startEdit(color)}
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
