"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { shortProductUrl } from "@/lib/product-og";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback para navegadores sem Clipboard API (ou contexto não seguro)
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }
}

// Copia https://karycuradoria.com.br/p/<sku_base> — link curto para DM.
export function CopyShortLinkButton({
  skuBase,
  variant = "icon",
  className,
}: {
  skuBase: string;
  variant?: "icon" | "full";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const url = shortProductUrl(skuBase);

  const handleClick = async () => {
    if (await copyText(url)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      window.prompt("Copie o link:", url);
    }
  };

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={url}
        className={cn(
          "inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors",
          copied
            ? "border-green-300 bg-green-50 text-green-700"
            : "border-gray-200 text-gray-600 hover:border-kc hover:text-kc",
          className
        )}
      >
        {copied ? <Check size={13} /> : <Link2 size={13} />}
        {copied ? "Link copiado" : "Copiar link curto"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={copied ? "Link copiado" : `Copiar link curto (${url})`}
      aria-label={copied ? "Link copiado" : "Copiar link curto"}
      className={cn(
        "relative p-1.5 transition-colors",
        copied ? "text-green-600" : "text-gray-400 hover:text-kc",
        className
      )}
    >
      {copied ? <Check size={14} /> : <Link2 size={14} />}
      {copied && (
        <span className="absolute right-full top-1/2 -translate-y-1/2 mr-1 whitespace-nowrap text-[10px] bg-gray-900 text-white px-1.5 py-0.5 rounded">
          Link copiado
        </span>
      )}
    </button>
  );
}
