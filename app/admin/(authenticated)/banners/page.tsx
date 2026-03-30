"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import {
  Plus, Pencil, Trash2, X, Check, ChevronUp, ChevronDown,
  ImageIcon, Eye, EyeOff, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Banner } from "@/types/database";

// ── Form state ────────────────────────────────────────────────────────────────

interface FormState {
  title: string; button_link: string;
  order_index: number; active: boolean;
}

const EMPTY: FormState = {
  title: "", button_link: "",
  order_index: 0, active: true,
};

// ── Dimensões alvo ────────────────────────────────────────────────────────────

const DIMENSIONS = {
  desktop: { w: 1920, h: 680 },
  mobile:  { w: 768,  h: 500 },
};

// ── Crop/resize via Canvas ────────────────────────────────────────────────────
// createImageBitmap: API assíncrona nativa — sem onload callbacks, sem race conditions

async function cropToFit(file: File, type: "desktop" | "mobile"): Promise<File> {
  const { w, h } = DIMENSIONS[type];

  // Decodifica a imagem diretamente do File (sem FileReader, sem Image.onload)
  const bitmap = await createImageBitmap(file);

  const canvas = document.createElement("canvas");
  canvas.width  = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D não disponível neste browser.");

  // Estratégia "cover": escala mínima para cobrir todo o canvas, centralizado
  const scale = Math.max(w / bitmap.width, h / bitmap.height);
  const sw    = bitmap.width  * scale;
  const sh    = bitmap.height * scale;
  const dx    = (w - sw) / 2;
  const dy    = (h - sh) / 2;

  ctx.drawImage(bitmap, dx, dy, sw, sh);
  bitmap.close();

  // toDataURL é síncrono e universalmente suportado (mais confiável que toBlob)
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

  // Converte dataURL → Blob → File
  const res  = await fetch(dataUrl);
  const blob = await res.blob();

  return new File(
    [blob],
    file.name.replace(/\.[^.]+$/, "") + ".jpg",
    { type: "image/jpeg" },
  );
}

// ── Upload helper ─────────────────────────────────────────────────────────────

async function uploadImage(file: File, folder: "desktop" | "mobile"): Promise<string | null> {
  const body = new FormData();
  body.append("file", file);
  body.append("folder", folder);

  const res = await fetch("/api/admin/banners/upload", { method: "POST", body });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    console.error("Upload error:", d.error ?? res.statusText);
    return null;
  }
  const { url } = await res.json();
  return url ?? null;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BannersPage() {
  const [banners, setBanners]   = useState<Banner[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<Banner | null>(null);
  const [form, setForm]         = useState<FormState>(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  // Image files + previews + processing states
  const [desktopFile,    setDesktopFile]    = useState<File | null>(null);
  const [mobileFile,     setMobileFile]     = useState<File | null>(null);
  const [desktopPreview, setDesktopPreview] = useState<string>("");
  const [mobilePreview,  setMobilePreview]  = useState<string>("");
  const [desktopCropping, setDesktopCropping] = useState(false);
  const [mobileCropping,  setMobileCropping]  = useState(false);

  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchBanners(); }, []);

  async function fetchBanners() {
    try {
      const res = await fetch("/api/admin/banners");
      if (res.ok) setBanners(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    resetImages();
    setError("");
    setShowForm(true);
  }

  function openEdit(b: Banner) {
    setEditing(b);
    setForm({
      title:       b.title       ?? "",
      button_link: b.button_link ?? "",
      order_index: b.order_index ?? 0,
      active:      b.active,
    });
    resetImages();
    setDesktopPreview(b.image_desktop ?? "");
    setMobilePreview(b.image_mobile   ?? "");
    setError("");
    setShowForm(true);
  }

  function resetImages() {
    setDesktopFile(null);
    setMobileFile(null);
    setDesktopPreview("");
    setMobilePreview("");
    setDesktopCropping(false);
    setMobileCropping(false);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    resetImages();
    setError("");
  }

  async function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    type: "desktop" | "mobile",
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so same file can be re-selected
    e.target.value = "";

    const setProcessing = type === "desktop" ? setDesktopCropping : setMobileCropping;
    const setFile       = type === "desktop" ? setDesktopFile      : setMobileFile;
    const setPreview    = type === "desktop" ? setDesktopPreview   : setMobilePreview;

    setProcessing(true);
    setError("");

    try {
      const cropped = await cropToFit(file, type);
      const url = URL.createObjectURL(cropped);
      setFile(cropped);
      setPreview(url);
    } catch (err) {
      console.error("cropToFit error:", err);
      setError(`Erro ao processar imagem ${type}: ${err instanceof Error ? err.message : String(err)}`);
      // fallback: usa original sem crop
      setFile(file);
      setPreview(URL.createObjectURL(file));
    } finally {
      setProcessing(false);
    }
  }

  async function handleSave() {
    if (!editing && !desktopFile && !desktopPreview) {
      setError("A imagem desktop é obrigatória.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      let imageDesktop = editing?.image_desktop ?? null;
      let imageMobile  = editing?.image_mobile  ?? null;

      if (desktopFile) {
        const url = await uploadImage(desktopFile, "desktop");
        if (!url) { setError("Falha no upload da imagem desktop."); return; }
        imageDesktop = url;
      }
      if (mobileFile) {
        const url = await uploadImage(mobileFile, "mobile");
        if (!url) { setError("Falha no upload da imagem mobile."); return; }
        imageMobile = url;
      }

      const payload = {
        ...form,
        title:         form.title       || null,
        button_link:   form.button_link || null,
        image_desktop: imageDesktop,
        image_mobile:  imageMobile,
      };

      const res = editing
        ? await fetch(`/api/admin/banners/${editing.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/banners", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Erro ao salvar.");
        return;
      }

      closeForm();
      fetchBanners();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(b: Banner) {
    if (!confirm(`Excluir o banner "${b.title ?? "sem título"}"?`)) return;
    await fetch(`/api/admin/banners/${b.id}`, { method: "DELETE" });
    setBanners((prev) => prev.filter((x) => x.id !== b.id));
  }

  async function toggleActive(b: Banner) {
    await fetch(`/api/admin/banners/${b.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !b.active }),
    });
    setBanners((prev) => prev.map((x) => x.id === b.id ? { ...x, active: !x.active } : x));
  }

  async function move(b: Banner, dir: -1 | 1) {
    const sorted = [...banners].sort((a, bb) => a.order_index - bb.order_index);
    const idx    = sorted.findIndex((x) => x.id === b.id);
    const target = sorted[idx + dir];
    if (!target) return;

    await Promise.all([
      fetch(`/api/admin/banners/${b.id}/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_index: target.order_index }),
      }),
      fetch(`/api/admin/banners/${target.id}/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_index: b.order_index }),
      }),
    ]);
    fetchBanners();
  }

  const labelCls = "block text-[11px] tracking-wider text-gray-500 uppercase mb-1.5";
  const inputCls = "w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-kc";

  // ── Render: formulário OU lista (nunca os dois) ───────────────────────────

  if (showForm) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-serif font-medium text-kc-dark">
            {editing ? "Editar Banner" : "Novo Banner"}
          </h1>
          <button onClick={closeForm} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="bg-white border border-kc-line rounded-lg p-6 shadow-sm space-y-6 max-w-4xl">

          {/* Imagens */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Desktop */}
            <div>
              <label className={labelCls}>
                Imagem Desktop *
                <span className="normal-case text-gray-400 ml-1">(auto ajuste para 1920×680px)</span>
              </label>
              <div
                onClick={() => !desktopCropping && desktopInputRef.current?.click()}
                className={cn(
                  "relative border-2 border-dashed rounded-lg overflow-hidden transition-colors",
                  desktopCropping ? "cursor-wait border-kc/40" : "cursor-pointer",
                  desktopPreview ? "border-kc/30" : "border-gray-200 hover:border-kc/50",
                )}
                style={{ aspectRatio: "1920/680" }}
              >
                {desktopPreview ? (
                  <Image src={desktopPreview} alt="Preview desktop" fill className="object-cover" unoptimized />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-300">
                    <ImageIcon size={28} />
                    <span className="text-xs">Clique para selecionar</span>
                  </div>
                )}
                {desktopCropping && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/80">
                    <Loader2 size={24} className="animate-spin text-kc" />
                    <span className="text-xs text-kc font-medium">Ajustando imagem…</span>
                  </div>
                )}
              </div>
              <input ref={desktopInputRef} type="file" accept="image/*"
                className="hidden" onChange={(e) => handleFileChange(e, "desktop")} />
              {desktopPreview && !desktopCropping && (
                <button
                  onClick={() => { setDesktopPreview(""); setDesktopFile(null); }}
                  className="mt-1 text-xs text-red-500 hover:underline">
                  Remover
                </button>
              )}
              {desktopPreview && !desktopCropping && (
                <p className="mt-1 text-[10px] text-green-600">✓ 1920×680px — pronta para upload</p>
              )}
            </div>

            {/* Mobile */}
            <div>
              <label className={labelCls}>
                Imagem Mobile
                <span className="normal-case text-gray-400 ml-1">(opcional · auto ajuste 768×500px)</span>
              </label>
              <div
                onClick={() => !mobileCropping && mobileInputRef.current?.click()}
                className={cn(
                  "relative border-2 border-dashed rounded-lg overflow-hidden transition-colors",
                  mobileCropping ? "cursor-wait border-kc/40" : "cursor-pointer",
                  mobilePreview ? "border-kc/30" : "border-gray-200 hover:border-kc/50",
                )}
                style={{ aspectRatio: "768/500" }}
              >
                {mobilePreview ? (
                  <Image src={mobilePreview} alt="Preview mobile" fill className="object-cover" unoptimized />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-300">
                    <ImageIcon size={24} />
                    <span className="text-xs">Clique para selecionar</span>
                  </div>
                )}
                {mobileCropping && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/80">
                    <Loader2 size={20} className="animate-spin text-kc" />
                    <span className="text-xs text-kc font-medium">Ajustando…</span>
                  </div>
                )}
              </div>
              <input ref={mobileInputRef} type="file" accept="image/*"
                className="hidden" onChange={(e) => handleFileChange(e, "mobile")} />
              {mobilePreview && !mobileCropping && (
                <button
                  onClick={() => { setMobilePreview(""); setMobileFile(null); }}
                  className="mt-1 text-xs text-red-500 hover:underline">
                  Remover
                </button>
              )}
              {mobilePreview && !mobileCropping && (
                <p className="mt-1 text-[10px] text-green-600">✓ 768×500px — pronta para upload</p>
              )}
            </div>
          </div>

          {/* Textos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                Título <span className="normal-case text-gray-400">(aparece ao passar o mouse)</span>
              </label>
              <input type="text" value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Nova Coleção · Outono 2026" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>
                Link <span className="normal-case text-gray-400">(clicar na imagem abre este link)</span>
              </label>
              <input type="text" value={form.button_link}
                onChange={(e) => setForm({ ...form, button_link: e.target.value })}
                placeholder="/produtos" className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Ordem</label>
              <input type="number" min={0} value={form.order_index}
                onChange={(e) => setForm({ ...form, order_index: parseInt(e.target.value) || 0 })}
                className={inputCls} />
            </div>

            <div className="flex items-center gap-3 pt-5">
              <button type="button"
                onClick={() => setForm({ ...form, active: !form.active })}
                className={cn("relative w-10 h-5 rounded-full transition-colors",
                  form.active ? "bg-kc" : "bg-gray-300")}>
                <span className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                  form.active ? "left-5" : "left-0.5")} />
              </button>
              <span className="text-sm text-gray-600">{form.active ? "Ativo" : "Inativo"}</span>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>
          )}

          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving || desktopCropping || mobileCropping}
              className="flex items-center gap-2 bg-kc text-white text-[11px] tracking-[0.14em] uppercase px-5 py-2.5 hover:bg-kc-dark transition-colors disabled:opacity-60">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />}
              {saving ? "Salvando..." : editing ? "Salvar Alterações" : "Criar Banner"}
            </button>
            <button onClick={closeForm}
              className="text-[11px] tracking-[0.14em] uppercase px-5 py-2.5 border border-gray-200 text-gray-500 hover:border-gray-300 transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: lista ─────────────────────────────────────────────────────────

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif font-medium text-kc-dark">Banners</h1>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-kc text-white text-[11px] tracking-[0.14em] uppercase px-4 py-2.5 hover:bg-kc-dark transition-colors">
          <Plus size={14} /> Novo Banner
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400">
          Carregando...
        </div>
      ) : banners.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <ImageIcon size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 mb-4">Nenhum banner cadastrado.</p>
          <button onClick={openCreate}
            className="inline-flex items-center gap-2 bg-kc text-white text-[11px] tracking-[0.14em] uppercase px-5 py-2.5 hover:bg-kc-dark transition-colors">
            <Plus size={14} /> Criar primeiro banner
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {[...banners]
            .sort((a, b) => a.order_index - b.order_index)
            .map((b, idx, arr) => (
              <div key={b.id}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden flex gap-4 p-4 items-center">

                {/* Thumbnail */}
                <div className="w-40 h-20 shrink-0 rounded overflow-hidden bg-gray-100 relative">
                  {b.image_desktop ? (
                    <Image src={b.image_desktop} alt={b.title ?? "banner"} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <ImageIcon size={24} />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-kc-dark text-sm truncate">
                    {b.title ?? <span className="text-gray-400 italic">Sem título</span>}
                  </p>
                  {b.subtitle && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">{b.subtitle}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] text-gray-400">Ordem: {b.order_index}</span>
                    {b.button_text && (
                      <span className="text-[10px] bg-kc/10 text-kc px-1.5 py-0.5 rounded">
                        CTA: {b.button_text}
                      </span>
                    )}
                    <span className={cn(
                      "text-[10px] tracking-wider uppercase px-1.5 py-0.5 rounded-full font-medium",
                      b.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500",
                    )}>
                      {b.active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => move(b, -1)} disabled={idx === 0}
                    className="p-1.5 text-gray-400 hover:text-kc-dark disabled:opacity-30 transition-colors"
                    title="Mover para cima">
                    <ChevronUp size={16} />
                  </button>
                  <button onClick={() => move(b, 1)} disabled={idx === arr.length - 1}
                    className="p-1.5 text-gray-400 hover:text-kc-dark disabled:opacity-30 transition-colors"
                    title="Mover para baixo">
                    <ChevronDown size={16} />
                  </button>
                  <button onClick={() => toggleActive(b)}
                    className="p-1.5 text-gray-400 hover:text-kc transition-colors"
                    title={b.active ? "Desativar" : "Ativar"}>
                    {b.active ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <button onClick={() => openEdit(b)}
                    className="p-1.5 text-gray-400 hover:text-kc transition-colors"
                    title="Editar">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => handleDelete(b)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    title="Excluir">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
