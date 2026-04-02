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
  Pencil,
  Plus,
  Trash2,
  X,
  Loader2,
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

const DIMENSIONS = {
  desktop: { w: 1920, h: 520 },
  mobile: { w: 1080, h: 1350 },
};

const TRANSPORT_LIMIT_BYTES = 3.8 * 1024 * 1024;

async function loadImageElement(file: File) {
  const image = document.createElement("img");
  const url = URL.createObjectURL(file);

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Falha ao carregar imagem."));
    image.src = url;
  });

  return { image, url };
}

async function fileToImageSource(file: File) {
  if ("createImageBitmap" in window) {
    const bitmap = await createImageBitmap(file);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      dispose: () => bitmap.close(),
    };
  }

  const { image, url } = await loadImageElement(file);
  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    dispose: () => URL.revokeObjectURL(url),
  };
}

async function canvasToFile(
  canvas: HTMLCanvasElement,
  name: string,
  quality: number
) {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );

  if (!blob) {
    throw new Error("Falha ao preparar imagem para envio.");
  }

  return new File([blob], name.replace(/\.[^.]+$/, "") + ".jpg", {
    type: "image/jpeg",
  });
}

async function prepareBannerForUpload(
  file: File,
  type: "desktop" | "mobile"
): Promise<File> {
  if (file.size <= TRANSPORT_LIMIT_BYTES) {
    return file;
  }

  const preparedSource = await fileToImageSource(file);
  const maxWidth = type === "desktop" ? 3200 : 1800;
  const maxHeight = type === "desktop" ? 2200 : 2400;

  const scale = Math.min(
    1,
    maxWidth / preparedSource.width,
    maxHeight / preparedSource.height
  );

  const width = Math.max(1, Math.round(preparedSource.width * scale));
  const height = Math.max(1, Math.round(preparedSource.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    preparedSource.dispose();
    throw new Error("Canvas 2D indisponivel.");
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(preparedSource.source, 0, 0, width, height);
  preparedSource.dispose();

  let quality = 0.96;
  let prepared = await canvasToFile(canvas, file.name, quality);

  while (prepared.size > TRANSPORT_LIMIT_BYTES && quality > 0.82) {
    quality -= 0.04;
    prepared = await canvasToFile(canvas, file.name, quality);
  }

  if (prepared.size > TRANSPORT_LIMIT_BYTES) {
    throw new Error("A imagem ainda ficou grande demais. Tente um arquivo mais leve.");
  }

  return prepared;
}

async function uploadImage(
  file: File,
  folder: "desktop" | "mobile"
): Promise<string | null> {
  const body = new FormData();
  body.append("file", file);
  body.append("folder", folder);

  const res = await fetch("/api/admin/banners/upload", { method: "POST", body });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    console.error("Upload error:", data.error ?? res.statusText);
    return null;
  }

  const { url } = await res.json();
  return url ?? null;
}

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [desktopFile, setDesktopFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const [desktopPreview, setDesktopPreview] = useState("");
  const [mobilePreview, setMobilePreview] = useState("");
  const [desktopPreparing, setDesktopPreparing] = useState(false);
  const [mobilePreparing, setMobilePreparing] = useState(false);

  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

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
    setDesktopFile(null);
    setMobileFile(null);
    setDesktopPreview("");
    setMobilePreview("");
    setDesktopPreparing(false);
    setMobilePreparing(false);
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
    setDesktopPreview(banner.image_desktop ?? "");
    setMobilePreview(banner.image_mobile ?? "");
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

  async function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    type: "desktop" | "mobile"
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = "";
    setError("");

    const setPreparing =
      type === "desktop" ? setDesktopPreparing : setMobilePreparing;

    setPreparing(true);

    try {
      const prepared = await prepareBannerForUpload(file, type);
      const preview = URL.createObjectURL(prepared);

      if (type === "desktop") {
        setDesktopFile(prepared);
        setDesktopPreview(preview);
      } else {
        setMobileFile(prepared);
        setMobilePreview(preview);
      }
    } catch (error) {
      setError((error as Error).message || "Falha ao preparar imagem.");
    } finally {
      setPreparing(false);
    }
  }

  async function handleSave() {
    if (!editing && !desktopFile && !desktopPreview) {
      setError("A imagem desktop e obrigatoria.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      let imageDesktop = editing?.image_desktop ?? null;
      let imageMobile = editing?.image_mobile ?? null;

      if (desktopFile) {
        const url = await uploadImage(desktopFile, "desktop");
        if (!url) {
          setError("Falha no upload da imagem desktop.");
          return;
        }
        imageDesktop = url;
      }

      if (mobileFile) {
        const url = await uploadImage(mobileFile, "mobile");
        if (!url) {
          setError("Falha no upload da imagem mobile.");
          return;
        }
        imageMobile = url;
      }

      const payload = {
        title: form.title || null,
        subtitle: form.subtitle || null,
        button_text: form.button_text || null,
        button_link: form.button_link || null,
        text_position: form.text_position,
        text_color: form.text_color,
        image_desktop: imageDesktop,
        image_mobile: imageMobile,
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
    if (!confirm(`Excluir o banner "${banner.title ?? "sem titulo"}"?`)) return;
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

  const labelCls =
    "mb-1.5 block text-[11px] uppercase tracking-wider text-gray-500";
  const inputCls =
    "w-full rounded border border-gray-200 px-3 py-2.5 text-sm focus:border-kc focus:outline-none";

  if (showForm) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-serif font-medium text-kc-dark">
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
          <div className="rounded-lg border border-kc-line bg-kc-cream/40 px-4 py-3 text-xs leading-relaxed text-kc-dark/75">
            Antes do envio, a imagem e reduzida no navegador para evitar erro
            de limite na Vercel. O recorte final continua acontecendo no
            servidor, em {DIMENSIONS.desktop.w}x{DIMENSIONS.desktop.h}px no
            desktop e {DIMENSIONS.mobile.w}x{DIMENSIONS.mobile.h}px no mobile.
            No celular, o banner agora usa formato vertical para preencher bem
            a tela em modo retrato, sempre priorizando o topo da foto.
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className={labelCls}>
                Imagem Desktop *
                <span className="ml-1 normal-case text-gray-400">
                  (ajuste automatico no upload para {DIMENSIONS.desktop.w}x
                  {DIMENSIONS.desktop.h}px)
                </span>
              </label>
              <div
                onClick={() => desktopInputRef.current?.click()}
                className={cn(
                  "relative cursor-pointer overflow-hidden rounded-lg border-2 border-dashed transition-colors",
                  desktopPreview
                    ? "border-kc/30"
                    : "border-gray-200 hover:border-kc/50"
                )}
                style={{ aspectRatio: `${DIMENSIONS.desktop.w}/${DIMENSIONS.desktop.h}` }}
              >
                {desktopPreview ? (
                  <Image
                    src={desktopPreview}
                    alt="Preview desktop"
                    fill
                    className="object-cover object-top"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-300">
                    <ImageIcon size={28} />
                    <span className="text-xs">Clique para selecionar</span>
                  </div>
                )}
              </div>
              <input
                ref={desktopInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(e, "desktop")}
              />
              {desktopPreview && (
                <button
                  onClick={() => {
                    setDesktopPreview("");
                    setDesktopFile(null);
                  }}
                  className="mt-1 text-xs text-red-500 hover:underline"
                >
                  Remover
                </button>
              )}
              {desktopPreparing && (
                <p className="mt-1 text-xs text-kc">Preparando envio...</p>
              )}
            </div>

            <div>
              <label className={labelCls}>
                Imagem Mobile
                <span className="ml-1 normal-case text-gray-400">
                  (opcional, ajuste automatico para {DIMENSIONS.mobile.w}x
                  {DIMENSIONS.mobile.h}px)
                </span>
              </label>
              <div
                onClick={() => mobileInputRef.current?.click()}
                className={cn(
                  "relative cursor-pointer overflow-hidden rounded-lg border-2 border-dashed transition-colors",
                  mobilePreview
                    ? "border-kc/30"
                    : "border-gray-200 hover:border-kc/50"
                )}
                style={{ aspectRatio: `${DIMENSIONS.mobile.w}/${DIMENSIONS.mobile.h}` }}
              >
                {mobilePreview ? (
                  <Image
                    src={mobilePreview}
                    alt="Preview mobile"
                    fill
                    className="object-cover object-top"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-300">
                    <ImageIcon size={24} />
                    <span className="text-xs">Clique para selecionar</span>
                  </div>
                )}
              </div>
              <input
                ref={mobileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(e, "mobile")}
              />
              {mobilePreview && (
                <button
                  onClick={() => {
                    setMobilePreview("");
                    setMobileFile(null);
                  }}
                  className="mt-1 text-xs text-red-500 hover:underline"
                >
                  Remover
                </button>
              )}
              {mobilePreparing && (
                <p className="mt-1 text-xs text-kc">Preparando envio...</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelCls}>Titulo Principal</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Nova Colecao"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Subtitulo</label>
              <input
                type="text"
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                placeholder="Linho, alfaiataria e classicos atemporais"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Texto do Botao</label>
              <input
                type="text"
                value={form.button_text}
                onChange={(e) =>
                  setForm({ ...form, button_text: e.target.value })
                }
                placeholder="Ver Colecao"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Link do Banner</label>
              <input
                type="text"
                value={form.button_link}
                onChange={(e) =>
                  setForm({ ...form, button_link: e.target.value })
                }
                placeholder="/produtos"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Posicao do Texto</label>
              <select
                value={form.text_position}
                onChange={(e) =>
                  setForm({
                    ...form,
                    text_position: e.target.value as Banner["text_position"],
                  })
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
                  setForm({
                    ...form,
                    text_color: e.target.value as Banner["text_color"],
                  })
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
                  setForm({
                    ...form,
                    order_index: parseInt(e.target.value, 10) || 0,
                  })
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
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || desktopPreparing || mobilePreparing}
              className="flex items-center gap-2 bg-kc px-5 py-2.5 text-[11px] uppercase tracking-[0.14em] text-white transition-colors hover:bg-kc-dark disabled:opacity-60"
            >
              {saving ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Check size={14} />
              )}
              {saving
                ? "Salvando..."
                : editing
                  ? "Salvar Alteracoes"
                  : "Criar Banner"}
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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-serif font-medium text-kc-dark">
          Banners
        </h1>
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
                      className="object-cover object-top"
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
                      <span className="italic text-gray-400">Sem titulo</span>
                    )}
                  </p>
                  {banner.subtitle && (
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {banner.subtitle}
                    </p>
                  )}
                  <div className="mt-1.5 flex items-center gap-3">
                    <span className="text-[10px] text-gray-400">
                      Ordem: {banner.order_index}
                    </span>
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
