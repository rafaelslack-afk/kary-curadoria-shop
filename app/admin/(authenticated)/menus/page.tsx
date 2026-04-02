"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown, Save, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavLink {
  id: string;
  label: string;
  href: string;
  order_index: number;
  active: boolean;
}

const EMPTY_FORM = { label: "", href: "", active: true };

export default function MenusPage() {
  const [links, setLinks] = useState<NavLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/nav-links");
    const data = await res.json();
    setLinks(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save(link: NavLink) {
    setSaving(link.id);
    await fetch(`/api/admin/nav-links/${link.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: link.label, href: link.href, active: link.active }),
    });
    setSaving(null);
  }

  function updateField(id: string, field: keyof NavLink, value: unknown) {
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  }

  async function toggleActive(link: NavLink) {
    const updated = { ...link, active: !link.active };
    updateField(link.id, "active", !link.active);
    setSaving(link.id);
    await fetch(`/api/admin/nav-links/${link.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !link.active }),
    });
    setSaving(null);
    // Recarregar se desativou o único ativo
    if (updated.active === false) load();
  }

  async function move(link: NavLink, direction: "up" | "down") {
    const sorted = [...links].sort((a, b) => a.order_index - b.order_index);
    const idx = sorted.findIndex((l) => l.id === link.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const other = sorted[swapIdx];
    const newOrder = link.order_index;
    const otherOrder = other.order_index;

    setLinks((prev) =>
      prev.map((l) => {
        if (l.id === link.id) return { ...l, order_index: otherOrder };
        if (l.id === other.id) return { ...l, order_index: newOrder };
        return l;
      })
    );

    await Promise.all([
      fetch(`/api/admin/nav-links/${link.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_index: otherOrder }),
      }),
      fetch(`/api/admin/nav-links/${other.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_index: newOrder }),
      }),
    ]);
  }

  async function deleteLink(link: NavLink) {
    if (!confirm(`Excluir link "${link.label}"?`)) return;
    const res = await fetch(`/api/admin/nav-links/${link.id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error ?? "Erro ao excluir.");
      return;
    }
    setLinks((prev) => prev.filter((l) => l.id !== link.id));
  }

  async function createLink() {
    if (!newForm.label.trim() || !newForm.href.trim()) {
      setError("Preencha o nome e a URL do link.");
      return;
    }
    setCreating(true);
    setError("");
    const maxOrder = links.length > 0 ? Math.max(...links.map((l) => l.order_index)) : 0;
    const res = await fetch("/api/admin/nav-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newForm, order_index: maxOrder + 1 }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Erro ao criar link.");
    } else {
      setLinks((prev) => [...prev, data]);
      setNewForm(EMPTY_FORM);
      setShowNewForm(false);
    }
    setCreating(false);
  }

  const sorted = [...links].sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-medium text-gray-900">Menus do Site</h1>
          <p className="text-xs text-gray-500 mt-0.5">Links exibidos na barra de navegação da loja</p>
        </div>
        <Button size="sm" onClick={() => { setShowNewForm(true); setError(""); }}>
          <Plus size={14} className="mr-1.5" />
          Novo Link
        </Button>
      </div>

      {/* Aviso */}
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-md px-4 py-3 mb-6 text-xs text-amber-800">
        <Info size={13} className="mt-0.5 shrink-0" />
        Alterações aparecem imediatamente na loja (cache de 60 segundos).
      </div>

      {/* Formulário novo link */}
      {showNewForm && (
        <div className="border border-kc-line rounded-md p-4 mb-4 bg-gray-50 space-y-3">
          <p className="text-xs font-medium text-gray-700">Novo link</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Nome</label>
              <input
                type="text"
                placeholder="Ex: Promoções"
                value={newForm.label}
                onChange={(e) => setNewForm((f) => ({ ...f, label: e.target.value }))}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-kc"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">URL</label>
              <input
                type="text"
                placeholder="Ex: /produtos ou https://..."
                value={newForm.href}
                onChange={(e) => setNewForm((f) => ({ ...f, href: e.target.value }))}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-kc"
              />
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
            <label htmlFor="new-active" className="text-xs text-gray-600">Ativo</label>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={createLink} disabled={creating}>
              {creating ? "Criando..." : "Criar Link"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowNewForm(false); setError(""); }}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <p className="text-sm text-gray-400">Carregando...</p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhum link cadastrado.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((link, idx) => (
            <div
              key={link.id}
              className={`flex items-center gap-3 border rounded-md px-4 py-3 ${
                link.active ? "border-gray-200 bg-white" : "border-gray-100 bg-gray-50 opacity-60"
              }`}
            >
              {/* Reordenar */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => move(link, "up")}
                  disabled={idx === 0}
                  className="text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  onClick={() => move(link, "down")}
                  disabled={idx === sorted.length - 1}
                  className="text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors"
                >
                  <ChevronDown size={14} />
                </button>
              </div>

              {/* Campos editáveis */}
              <div className="flex-1 grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={link.label}
                  onChange={(e) => updateField(link.id, "label", e.target.value)}
                  className="border border-transparent hover:border-gray-200 focus:border-kc rounded px-2 py-1 text-sm focus:outline-none transition-colors"
                  placeholder="Nome"
                />
                <input
                  type="text"
                  value={link.href}
                  onChange={(e) => updateField(link.id, "href", e.target.value)}
                  className="border border-transparent hover:border-gray-200 focus:border-kc rounded px-2 py-1 text-sm text-gray-500 focus:outline-none transition-colors font-mono text-xs"
                  placeholder="URL"
                />
              </div>

              {/* Ativo toggle */}
              <button
                onClick={() => toggleActive(link)}
                disabled={saving === link.id}
                className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                  link.active
                    ? "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                    : "border-gray-200 text-gray-400 hover:bg-gray-100"
                }`}
              >
                {link.active ? "Ativo" : "Inativo"}
              </button>

              {/* Salvar */}
              <button
                onClick={() => save(link)}
                disabled={saving === link.id}
                title="Salvar alterações"
                className="text-gray-300 hover:text-kc transition-colors disabled:opacity-40"
              >
                <Save size={15} />
              </button>

              {/* Excluir */}
              <button
                onClick={() => deleteLink(link)}
                title="Excluir link"
                className="text-gray-300 hover:text-red-500 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
