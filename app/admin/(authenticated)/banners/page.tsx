"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  ImageIcon,
  Link as LinkIcon,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Banner } from "@/types/database";

interface FormState {
  title: string;
  subtitle: string;
  button_text: string;
  button_link: string;
  text_position: Banner["text_position"];
  text_color: Banner["text_color"];
  order_index: number;
  active: boolean;
}

const EMPTY: FormState = {
  title: "",
  subtitle: "",
  button_text: "",
  button_link: "",
  text_position: "center",
  text_color: "light",
  order_index: 0,
  active: true,
};

// ── Upload direto ao Supabase via URL assinada ──────────────────────────────

async function getSignedUrl(
  folder: "desktop" | "mobile",
  filename: string
): Promise<{ signedUrl: string; publicUrl: string }> {
  const res = await fetch("/api/admin/banners/signed-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder, filename }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error ?? "Falha ao obter URL de upload.");
  }
  return res.json();
}

async function uploadDirect(
  file: File,
  folder: "desktop" | "mobile",
  onProgress: (pct: number) => void
): Promise<string> {
  const { signedUrl, publicUrl } = await getSignedUrl(folder, file.name);

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload falhou: HTTP ${xhr.status}`));
    xhr.onerror = () => reject(new Error("Erro de rede ao fazer upload."));
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("Content-Type", file.type || "image/jpeg");
    xhr.send(file);
  });

  return publicUrl;
}

// ── Componente de upload de imagem ──────────────────────────────────────────

interface ImageFieldProps {
  label: string;
  hint: string;
  imageUrl: string;
  progress: number | null; // null = idle, 0-100 = uploading
  onFile: (file: File) => void;
  onUrlChange: (url: string) => void;
  onClear: () => void;
}

function ImageField({
  label,
  hint,
  imageUrl,
  progress,
  onFile,
  onUrlChange,
  onClear,
}: ImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");

  const uploading = progress !== null;

  function handleUrlConfirm() {
    const u = urlDraft.trim();
    if (!u) return;
    onUrlChange(u);
    setUrlDraft("");
    setShowUrlInput(false);
  }

  return (
    <div>
      <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-gray-500">
        {label}
        <span className="ml-1 normal-case text-gray-400">{hint}</span>
      </label>

      {/* Preview / drop zone */}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        className={cn(
          "relative overflow-hidden rounded-lg border-2 transition-colors",
          imageUrl ? "border-kc/30" : "cursor-pointer border-dashed border-gray-200 hover:border-kc/50",
          uploading && "cursor-default"
        )}
        style={{ aspectRatio: "16/5" }}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt="Preview"
            fill
            className="object-cover object-center"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-300">
            <ImageIcon size={28} />
            <span className="text-xs">Clique para selecionar arquivo</span>
          </div>
        )}

        {/* Progress overlay */}
        {uploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50">
            <Loader2 size={22} className="animate-spin text-white" />
            <span className="text-xs text-white font-medium">{progress}%</span>
            <div className="w-32 h-1.5 rounded-full bg-white/30 overflow-hidden">
              <div
                className="h-full bg-white transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onFile(f);
        }}
      />

      {/* Actions below preview */}
      <div className="mt-1.5 flex items-center gap-3">
        {imageUrl && !uploading && (
          <>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1 text-[11px] text-kc hover:underline"
            >
              <Upload size={11} /> Trocar arquivo
            </button>
            <button
              type="button"
              onClick={onClear}
              className="text-[11px] text-red-500 hover:underline"
            >
              Remover
            </button>
          </>
        )}

        {/* Paste URL toggle */}
        {!uploading && (
          <button
            type="button"
            onClick={() => setShowUrlInput((v) => !v)}
            className="ml-auto flex items-center gap-1 text-[11px] text-gray-400 hover:text-kc"
          >
            <LinkIcon size={11} />
            {showUrlInput ? "Fechar" : "Colar URL"}
          </button>
        )}
      </div>

      {/* URL paste input */}
      {showUrlInput && (
        <div className="mt-2 flex gap-2">
          <input
            type="url"
            placeholder="https://..."
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUrlConfirm()}
            className="flex-1 rounded border border-gray-200 px-3 py-1.5 text-xs focus:border-kc focus:outline-none"
          />
          <button
            type="button"
            onClick={handleUrlConfirm}
            disabled={!urlDraft.trim()}
            className="rounded bg-kc px-3 py-1.5 text-[11px] text-white hover:bg-kc-dark disabled:opacity-40"
          >
            Usar
          </button>
        </div>
      )}
    </div>
  );
}

// ── Página principal ────────────────────────────────────────────────────────

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [desktopUrl, setDesktopUrl] = useState("");
  const [mobileUrl, setMobileUrl] = useState("");
  const [desktopProgress, setDesktopProgress] = useState<number | null>(null);
  const [mobileProgress, setMobileProgress] = useState<number | null>(null);

  useEffect(() => {
    fetchBanners();
  }, []);

  async function fetchBanners() {
    try {
      const res = await fetch("/api/admin/banners");
      if (res.ok) setBanners(await res.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  function resetImages() {
    setDesktopUrl("");
    setMobileUrl("");
    setDesktopProgress(null);
    setMobileProgress(null);
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    resetImages();
    setError("");
    setShowForm(true);
  }

  function openEdit(banner: Banner) {
    setEditing(banner);
    setForm({
      title: banner.title ?? "",
      subtitle: banner.subtitle ?? "",
      button_text: banner.button_text ?? "",
      button_link: banner.button_link ?? "",
      text_position: banner.text_position ?? "center",
      text_color: banner.text_color ?? "light",
      order_index: banner.order_index ?? 0,
      active: banner.active,
    });
    resetImages();
    setDesktopUrl(banner.image_desktop ?? "");
    setMobileUrl(banner.image_mobile ?? "");
    setError("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY);
    resetImages();
    setError("");
  }

  async function handleFile(file: File, type: "desktop" | "mobile") {
    setError("");
    const setProgress = type === "desktop" ? setDesktopProgress : setMobileProgress;
    const setUrl = type === "desktop" ? setDesktopUrl : setMobileUrl;

    setProgress(0);
    try {
      const url = await uploadDirect(file, type, setProgress);
      setUrl(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProgress(null);
    }
  }

  async function handleSave() {
    if (!editing && !desktopUrl) {
      setError("A imagem desktop é obrigatória.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        title: form.title || null,
        subtitle: form.subtitle || null,
        button_text: form.button_text || null,
        button_link: form.button_link || null,
        text_position: form.text_position,
        text_color: form.text_color,
        image_desktop: desktopUrl || editing?.image_desktop || null,
        image_mobile: mobileUrl || editing?.image_mobile || null,
        order_index: form.order_index,
        active: form.active,
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
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Erro ao salvar.");
        return;
      }

      closeForm();
      fetchBanners();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(banner: Banner) {
    if (!confirm(`Excluir o banner "${banner.title ?? "sem título"}"?`)) return;
    await fetch(`/api/admin/banners/${banner.id}`, { method: "DELETE" });
    setBanners((prev) => prev.filter((item) => item.id !== banner.id));
  }

  async function toggleActive(banner: Banner) {
    await fetch(`/api/admin/banners/${banner.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !banner.active }),
    });
    setBanners((prev) =>
      prev.map((item) =>
        item.id === banner.id ? { ...item, active: !item.active } : item
      )
    );
  }

  async function move(banner: Banner, direction: -1 | 1) {
    const sorted = [...banners].sort((a, b) => a.order_index - b.order_index);
    const index = sorted.findIndex((item) => item.id === banner.id);
    const target = sorted[index + direction];
    if (!target) return;

    await Promise.all([
      fetch(`/api/admin/banners/${banner.id}/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_index: target.order_index }),
      }),
      fetch(`/api/admin/banners/${target.id}/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_index: banner.order_index }),
      }),
    ]);

    fetchBanners();
  }

  const inputCls =
    "w-full rounded border border-gray-200 px-3 py-2.5 text-sm focus:border-kc focus:outline-none";
  const labelCls = "mb-1.5 block text-[11px] uppercase tracking-wider text-gray-500";
  const uploading = desktopProgress !== null || mobileProgress !== null;

  if (showForm) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-serif text-2xl font-medium text-kc-dark">
            {editing ? "Editar Banner" : "Novo Banner"}
          </h1>
          <button
            onClick={closeForm}
            className="text-gray-400 transition-colors hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-w-4xl space-y-6 rounded-lg border border-kc-line bg-white p-6 shadow-sm">

          {/* Info */}
          <div className="rounded-lg border border-kc-line bg-kc-cream/40 px-4 py-3 text-xs leading-relaxed text-kc-dark/75">
            <strong>Upload direto</strong> — imagens enviadas sem compressão intermediária, qualidade original preservada.
            Formatos aceitos: JPG, PNG, WebP. Tamanho recomendado: 2000×600px (desktop) e 800×1000px (mobile).
            Você também pode <strong>colar uma URL</strong> de imagem do Supabase ou de qualquer CDN.
          </div>

          {/* Imagem Desktop */}
          <ImageField
            label="Imagem Desktop *"
            hint="(proporção ~16:5, ex: 2000×600px)"
            imageUrl={desktopUrl}
            progress={desktopProgress}
            onFile={(f) => handleFile(f, "desktop")}
            onUrlChange={setDesktopUrl}
            onClear={() => setDesktopUrl("")}
          />

          {/* Imagem Mobile */}
          <ImageField
            label="Imagem Mobile"
            hint="(opcional, proporção retrato, ex: 800×1000px)"
            imageUrl={mobileUrl}
            progress={mobileProgress}
            onFile={(f) => handleFile(f, "mobile")}
            onUrlChange={setMobileUrl}
            onClear={() => setMobileUrl("")}
          />

          {/* Campos de texto */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelCls}>Título Principal</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Nova Coleção"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Subtítulo</label>
              <input
                type="text"
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                placeholder="Linho, alfaiataria e clássicos atemporais"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Texto do Botão</label>
              <input
                type="text"
                value={form.button_text}
                onChange={(e) => setForm({ ...form, button_text: e.target.value })}
                placeholder="Ver Coleção"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Link do Banner</label>
              <input
                type="text"
                value={form.button_link}
                onChange={(e) => setForm({ ...form, button_link: e.target.value })}
                placeholder="/produtos"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Posição do Texto</label>
              <select
                value={form.text_position}
                onChange={(e) =>
                  setForm({ ...form, text_position: e.target.value as Banner["text_position"] })
                }
                className={inputCls}
              >
                <option value="left">Esquerda</option>
                <option value="center">Centro</option>
                <option value="right">Direita</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Cor do Texto</label>
              <select
                value={form.text_color}
                onChange={(e) =>
                  setForm({ ...form, text_color: e.target.value as Banner["text_color"] })
                }
                className={inputCls}
              >
                <option value="light">Claro</option>
                <option value="dark">Escuro</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Ordem</label>
              <input
                type="number"
                min={0}
                value={form.order_index}
                onChange={(e) =>
                  setForm({ ...form, order_index: parseInt(e.target.value, 10) || 0 })
                }
                className={inputCls}
              />
            </div>
            <div className="flex items-center gap-3 pt-5">
              <button
                type="button"
                onClick={() => setForm({ ...form, active: !form.active })}
                className={cn(
                  "relative h-5 w-10 rounded-full transition-colors",
                  form.active ? "bg-kc" : "bg-gray-300"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                    form.active ? "left-5" : "left-0.5"
                  )}
                />
              </button>
              <span className="text-sm text-gray-600">
                {form.active ? "Ativo" : "Inativo"}
              </span>
            </div>
          </div>

          {error && (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || uploading}
              className="flex items-center gap-2 bg-kc px-5 py-2.5 text-[11px] uppercase tracking-[0.14em] text-white transition-colors hover:bg-kc-dark disabled:opacity-60"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />}
              {saving ? "Salvando..." : uploading ? "Aguarde o upload..." : editing ? "Salvar Alterações" : "Criar Banner"}
            </button>
            <button
              onClick={closeForm}
              className="border border-gray-200 px-5 py-2.5 text-[11px] uppercase tracking-[0.14em] text-gray-500 transition-colors hover:border-gray-300"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Lista de banners ──────────────────────────────────────────────────────

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-medium text-kc-dark">Banners</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-kc px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] text-white transition-colors hover:bg-kc-dark"
        >
          <Plus size={14} /> Novo Banner
        </button>
      </div>

      {loading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-400">
          Carregando...
        </div>
      ) : banners.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <ImageIcon size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="mb-4 text-gray-500">Nenhum banner cadastrado.</p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 bg-kc px-5 py-2.5 text-[11px] uppercase tracking-[0.14em] text-white transition-colors hover:bg-kc-dark"
          >
            <Plus size={14} /> Criar primeiro banner
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {[...banners]
            .sort((a, b) => a.order_index - b.order_index)
            .map((banner, idx, arr) => (
              <div
                key={banner.id}
                className="flex items-center gap-4 overflow-hidden rounded-lg border border-gray-200 bg-white p-4"
              >
                <div className="relative h-20 w-40 shrink-0 overflow-hidden rounded bg-gray-100">
                  {banner.image_desktop ? (
                    <Image
                      src={banner.image_desktop}
                      alt={banner.title ?? "banner"}
                      fill
                      className="object-cover object-center"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-300">
                      <ImageIcon size={24} />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-kc-dark">
                    {banner.title ?? (
                      <span className="italic text-gray-400">Sem título</span>
                    )}
                  </p>
                  {banner.subtitle && (
                    <p className="mt-0.5 truncate text-xs text-gray-500">{banner.subtitle}</p>
                  )}
                  <div className="mt-1.5 flex items-center gap-3">
                    <span className="text-[10px] text-gray-400">Ordem: {banner.order_index}</span>
                    {banner.image_mobile && (
                      <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">
                        Mobile ✓
                      </span>
                    )}
                    {banner.button_text && (
                      <span className="rounded bg-kc/10 px-1.5 py-0.5 text-[10px] text-kc">
                        CTA: {banner.button_text}
                      </span>
                    )}
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                        banner.active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      )}
                    >
                      {banner.active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => move(banner, -1)}
                    disabled={idx === 0}
                    className="p-1.5 text-gray-400 transition-colors hover:text-kc-dark disabled:opacity-30"
                    title="Mover para cima"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    onClick={() => move(banner, 1)}
                    disabled={idx === arr.length - 1}
                    className="p-1.5 text-gray-400 transition-colors hover:text-kc-dark disabled:opacity-30"
                    title="Mover para baixo"
                  >
                    <ChevronDown size={16} />
                  </button>
                  <button
                    onClick={() => toggleActive(banner)}
                    className="p-1.5 text-gray-400 transition-colors hover:text-kc"
                    title={banner.active ? "Desativar" : "Ativar"}
                  >
                    {banner.active ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <button
                    onClick={() => openEdit(banner)}
                    className="p-1.5 text-gray-400 transition-colors hover:text-kc"
                    title="Editar"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(banner)}
                    className="p-1.5 text-gray-400 transition-colors hover:text-red-500"
                    title="Excluir"
                  >
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
