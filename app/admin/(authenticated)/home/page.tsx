"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown, Save, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HomeSection {
  id: string;
  title: string;
  description: string;
  href: string;
  button_text: string;
  icon_type: string;
  order_index: number;
  active: boolean;
}

const ICON_OPTIONS = [
  { value: "linen", label: "Linho" },
  { value: "suit", label: "Alfaiataria" },
  { value: "dress", label: "Vestido" },
  { value: "bag", label: "Bolsa" },
  { value: "star", label: "Destaque" },
  { value: "default", label: "Padrão" },
];

const EMPTY_FORM = {
  title: "",
  description: "",
  href: "",
  button_text: "Ver Coleção →",
  icon_type: "linen",
  active: true,
};

export default function HomeSectionsPage() {
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/home-sections");
    const data = await res.json();
    setSections(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function save(section: HomeSection) {
    setSaving(section.id);
    await fetch(`/api/admin/home-sections/${section.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: section.title,
        description: section.description,
        href: section.href,
        button_text: section.button_text,
        icon_type: section.icon_type,
        active: section.active,
      }),
    });
    setSaving(null);
  }

  function updateField(id: string, field: keyof HomeSection, value: unknown) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  }

  async function toggleActive(section: HomeSection) {
    updateField(section.id, "active", !section.active);
    setSaving(section.id);
    await fetch(`/api/admin/home-sections/${section.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !section.active }),
    });
    setSaving(null);
  }

  async function move(section: HomeSection, direction: "up" | "down") {
    const sorted = [...sections].sort((a, b) => a.order_index - b.order_index);
    const idx = sorted.findIndex((s) => s.id === section.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const other = sorted[swapIdx];
    const newOrder = section.order_index;
    const otherOrder = other.order_index;

    setSections((prev) =>
      prev.map((s) => {
        if (s.id === section.id) return { ...s, order_index: otherOrder };
        if (s.id === other.id) return { ...s, order_index: newOrder };
        return s;
      })
    );

    await Promise.all([
      fetch(`/api/admin/home-sections/${section.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_index: otherOrder }),
      }),
      fetch(`/api/admin/home-sections/${other.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_index: newOrder }),
      }),
    ]);
  }

  async function deleteSection(section: HomeSection) {
    if (!confirm(`Excluir card "${section.title}"?`)) return;
    const res = await fetch(`/api/admin/home-sections/${section.id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json();
      alert(json.error ?? "Erro ao excluir.");
      return;
    }
    setSections((prev) => prev.filter((s) => s.id !== section.id));
  }

  async function createSection() {
    if (!newForm.title.trim() || !newForm.href.trim()) {
      setError("Preencha o título e a URL.");
      return;
    }
    setCreating(true);
    setError("");
    const maxOrder = sections.length > 0 ? Math.max(...sections.map((s) => s.order_index)) : 0;
    const res = await fetch("/api/admin/home-sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newForm, order_index: maxOrder + 1 }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Erro ao criar.");
    } else {
      setSections((prev) => [...prev, data]);
      setNewForm(EMPTY_FORM);
      setShowNewForm(false);
    }
    setCreating(false);
  }

  const sorted = [...sections].sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Seção de Categorias — Home</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Cards exibidos abaixo do banner na página inicial
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setShowNewForm(true);
            setError("");
          }}
        >
          <Plus size={14} className="mr-1.5" />
          Novo Card
        </Button>
      </div>

      {/* Info */}
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-md px-4 py-3 mb-6 text-xs text-amber-800">
        <Info size={13} className="mt-0.5 shrink-0" />
        Alterações aparecem na loja em até 60 segundos. O ícone é decorativo e escolhido pela categoria.
      </div>

      {/* Novo card form */}
      {showNewForm && (
        <div className="border border-kc-line rounded-md p-4 mb-4 bg-gray-50 space-y-3">
          <p className="text-xs font-medium text-gray-700">Novo card</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">
                Título
              </label>
              <input
                type="text"
                placeholder="Ex: Vestidos"
                value={newForm.title}
                onChange={(e) => setNewForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-kc"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">
                URL
              </label>
              <input
                type="text"
                placeholder="Ex: /produtos?categoria=vestidos"
                value={newForm.href}
                onChange={(e) => setNewForm((f) => ({ ...f, href: e.target.value }))}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-kc"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">
              Descrição
            </label>
            <input
              type="text"
              placeholder="Ex: Elegância para todas as ocasiões"
              value={newForm.description}
              onChange={(e) => setNewForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-kc"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">
                Texto do botão
              </label>
              <input
                type="text"
                value={newForm.button_text}
                onChange={(e) => setNewForm((f) => ({ ...f, button_text: e.target.value }))}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-kc"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">
                Ícone
              </label>
              <select
                value={newForm.icon_type}
                onChange={(e) => setNewForm((f) => ({ ...f, icon_type: e.target.value }))}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-kc bg-white"
              >
                {ICON_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="new-active"
              checked={newForm.active}
              onChange={(e) => setNewForm((f) => ({ ...f, active: e.target.checked }))}
              className="rounded"
            />
            <label htmlFor="new-active" className="text-xs text-gray-600">
              Ativo
            </label>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={createSection} disabled={creating}>
              {creating ? "Criando..." : "Criar Card"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowNewForm(false);
                setError("");
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <p className="text-sm text-gray-400">Carregando...</p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhum card cadastrado.</p>
      ) : (
        <div className="space-y-3">
          {sorted.map((section, idx) => (
            <div
              key={section.id}
              className={`border rounded-md p-4 ${
                section.active
                  ? "border-gray-200 bg-white"
                  : "border-gray-100 bg-gray-50 opacity-60"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Reordenar */}
                <div className="flex flex-col gap-0.5 mt-1 shrink-0">
                  <button
                    onClick={() => move(section, "up")}
                    disabled={idx === 0}
                    className="text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => move(section, "down")}
                    disabled={idx === sorted.length - 1}
                    className="text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>

                {/* Campos */}
                <div className="flex-1 grid grid-cols-1 gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-0.5 uppercase tracking-wider">
                        Título
                      </label>
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => updateField(section.id, "title", e.target.value)}
                        className="w-full border border-transparent hover:border-gray-200 focus:border-kc rounded px-2 py-1 text-sm focus:outline-none transition-colors font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-0.5 uppercase tracking-wider">
                        URL
                      </label>
                      <input
                        type="text"
                        value={section.href}
                        onChange={(e) => updateField(section.id, "href", e.target.value)}
                        className="w-full border border-transparent hover:border-gray-200 focus:border-kc rounded px-2 py-1 text-sm text-gray-500 focus:outline-none transition-colors font-mono text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-0.5 uppercase tracking-wider">
                      Descrição
                    </label>
                    <input
                      type="text"
                      value={section.description}
                      onChange={(e) => updateField(section.id, "description", e.target.value)}
                      className="w-full border border-transparent hover:border-gray-200 focus:border-kc rounded px-2 py-1 text-sm text-gray-600 focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-0.5 uppercase tracking-wider">
                        Botão
                      </label>
                      <input
                        type="text"
                        value={section.button_text}
                        onChange={(e) => updateField(section.id, "button_text", e.target.value)}
                        className="w-full border border-transparent hover:border-gray-200 focus:border-kc rounded px-2 py-1 text-sm text-gray-600 focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-0.5 uppercase tracking-wider">
                        Ícone
                      </label>
                      <select
                        value={section.icon_type}
                        onChange={(e) => updateField(section.id, "icon_type", e.target.value)}
                        className="w-full border border-transparent hover:border-gray-200 focus:border-kc rounded px-2 py-1 text-sm text-gray-600 focus:outline-none transition-colors bg-transparent"
                      >
                        {ICON_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <button
                    onClick={() => toggleActive(section)}
                    disabled={saving === section.id}
                    className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                      section.active
                        ? "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                        : "border-gray-200 text-gray-400 hover:bg-gray-100"
                    }`}
                  >
                    {section.active ? "Ativo" : "Inativo"}
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => save(section)}
                      disabled={saving === section.id}
                      title="Salvar alterações"
                      className="text-gray-300 hover:text-kc transition-colors disabled:opacity-40"
                    >
                      <Save size={15} />
                    </button>
                    <button
                      onClick={() => deleteSection(section)}
                      title="Excluir card"
                      className="text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
