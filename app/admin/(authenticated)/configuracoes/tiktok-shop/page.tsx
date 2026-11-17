"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { TikTokIcon } from "@/components/loja/tiktok-shop-link";
import { TIKTOK_SHOP_TEXT_MAX, normalizeTikTokUrl } from "@/lib/tiktok-shop";

export default function TikTokShopConfigPage() {
  const [ativo, setAtivo] = useState(true);
  const [urlPerfil, setUrlPerfil] = useState("");
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/admin/config/tiktok-shop")
      .then((r) => r.json())
      .then((data) => {
        const c = data.config ?? {};
        setAtivo(c.ativo !== false);
        setUrlPerfil(c.url_perfil ?? "");
        setTexto(c.texto ?? "");
      })
      .catch(() => setError("Erro ao carregar configuração atual."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setError("");
    setSuccess("");

    if (!normalizeTikTokUrl(urlPerfil)) {
      setError("URL do perfil inválida: use um endereço tiktok.com.");
      return;
    }
    if (!texto.trim()) {
      setError("Informe o texto do convite.");
      return;
    }
    if (texto.trim().length > TIKTOK_SHOP_TEXT_MAX) {
      setError(`O texto pode ter no máximo ${TIKTOK_SHOP_TEXT_MAX} caracteres.`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/config/tiktok-shop", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo, url_perfil: urlPerfil, texto }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao salvar configuração.");
        return;
      }
      setUrlPerfil(data.config?.url_perfil ?? urlPerfil);
      setTexto(data.config?.texto ?? texto);
      setSuccess("Configuração salva com sucesso!");
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Erro de conexão ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-kc";
  const labelCls = "block text-[11px] tracking-wider text-gray-500 uppercase mb-1.5";

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <TikTokIcon size={22} className="text-kc-muted" />
        <div>
          <h1 className="text-2xl font-serif font-medium text-kc-dark">TikTok Shop</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Convite discreto na página do produto (abaixo dos botões de compra) e ícone no
            rodapé. Vale assim que salvo, sem novo deploy. Nunca aparece no carrinho, no
            checkout, no atacado ou no admin.
          </p>
        </div>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg mb-4">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {loading ? (
          <p className="text-sm text-gray-400">Carregando...</p>
        ) : (
          <div className="space-y-5">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
                className="w-4 h-4 accent-kc"
              />
              Mostrar o convite no site
            </label>
            {!ativo && (
              <p className="text-xs text-amber-600 -mt-3">
                Desligado: nada da TikTok Shop aparece no site.
              </p>
            )}

            <div>
              <label className={labelCls}>URL do perfil</label>
              <input
                type="url"
                value={urlPerfil}
                onChange={(e) => setUrlPerfil(e.target.value)}
                placeholder="https://www.tiktok.com/@karycuradoria"
                className={inputCls}
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Usada no rodapé e nos produtos sem link próprio na TikTok Shop.
              </p>
            </div>

            <div>
              <label className={labelCls}>Texto do convite</label>
              <input
                type="text"
                value={texto}
                maxLength={TIKTOK_SHOP_TEXT_MAX}
                onChange={(e) => setTexto(e.target.value)}
                className={inputCls}
              />
              <p className="text-[10px] text-gray-400 mt-1 text-right">
                {texto.length}/{TIKTOK_SHOP_TEXT_MAX}
              </p>
            </div>

            <Button onClick={handleSave} loading={saving} disabled={loading}>
              Salvar configuração
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
