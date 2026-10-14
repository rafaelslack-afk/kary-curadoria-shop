import { MessageCircle } from "lucide-react";
import { buildAtacadoWhatsAppUrl } from "@/lib/atacado/whatsapp";

// Sem cookie, cookie antigo ou link trocado no admin
export function LinkExpirado({ whatsapp }: { whatsapp: string }) {
  return (
    <main className="min-h-screen bg-kc-light flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="font-serif text-3xl text-kc-dark tracking-[0.12em]">KARY</p>
        <p className="text-[10px] tracking-[0.3em] text-kc-muted mb-10">CURADORIA · ATACADO</p>
        <h1 className="font-serif text-2xl text-kc-dark mb-3">Este link de atacado expirou</h1>
        <p className="text-sm text-kc-dark/70 mb-8">Peça um novo link à nossa equipe pelo WhatsApp.</p>
        <a
          href={buildAtacadoWhatsAppUrl(whatsapp, "Olá! Preciso de um novo link do catálogo de atacado.")}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: "#25D366" }}
        >
          <MessageCircle size={18} />
          Falar com a equipe no WhatsApp
        </a>
      </div>
    </main>
  );
}
