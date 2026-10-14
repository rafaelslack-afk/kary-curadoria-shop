"use client";

import { Sparkles } from "lucide-react";
import { useAtacadoConfig } from "@/components/atacado/AtacadoProvider";
import { buildAtacadoWhatsAppUrl, MENSAGEM_NOVIDADES } from "@/lib/atacado/whatsapp";

// Faixa fixa de lançamentos e novidades (não pode ser fechada). Some quando
// atacado_aviso_novidades.ativo = false no admin.
export function AvisoNovidades() {
  const { aviso, whatsapp } = useAtacadoConfig();
  if (!aviso.ativo) return null;

  return (
    <div className="rounded-xl bg-kc text-white px-4 py-3 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-start gap-3 flex-1">
        <Sparkles size={20} strokeWidth={1.75} className="shrink-0 mt-0.5" aria-hidden />
        <p className="text-[13px] sm:text-sm leading-snug">{aviso.texto}</p>
      </div>
      <a
        href={buildAtacadoWhatsAppUrl(whatsapp, MENSAGEM_NOVIDADES)}
        target="_blank"
        rel="noopener noreferrer"
        className="self-start sm:self-auto shrink-0 rounded-full bg-white text-kc-dark text-xs font-medium px-4 py-2 hover:bg-kc-cream transition-colors"
      >
        Ver novidades no WhatsApp
      </a>
    </div>
  );
}
