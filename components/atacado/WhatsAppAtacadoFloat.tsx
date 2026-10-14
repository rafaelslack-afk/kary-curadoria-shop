"use client";

import { MessageCircle } from "lucide-react";
import { useAtacadoConfig } from "@/components/atacado/AtacadoProvider";
import { buildAtacadoWhatsAppUrl } from "@/lib/atacado/whatsapp";

// Botão flutuante do atacado: aponta para o WhatsApp do ATACADO, não da loja
export function WhatsAppAtacadoFloat() {
  const { whatsapp } = useAtacadoConfig();
  return (
    <a
      href={buildAtacadoWhatsAppUrl(whatsapp, "Olá! Vim pelo catálogo de atacado.")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar com o atacado no WhatsApp"
      className="print:hidden fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform"
      style={{ backgroundColor: "#25D366" }}
    >
      <MessageCircle size={26} />
    </a>
  );
}
