import { checkAtacadoAccess } from "@/lib/atacado/access";
import { getRegraPrecoAtacado } from "@/lib/atacado/config";
import { AtacadoProvider } from "@/components/atacado/AtacadoProvider";
import { AtacadoHeader } from "@/components/atacado/AtacadoHeader";
import { LinkExpirado } from "@/components/atacado/LinkExpirado";
import { WhatsAppAtacadoFloat } from "@/components/atacado/WhatsAppAtacadoFloat";

export const dynamic = "force-dynamic";

// Toda página /atacado/** (exceto o romaneio) passa por aqui: sem cookie ou
// com token antigo, mostra a página de link expirado. Layout próprio: nada do
// varejo (assistente virtual, cupom flutuante, pop-ups, WhatsApp da loja).
export default async function AtacadoAreaLayout({ children }: { children: React.ReactNode }) {
  const { ok, config } = await checkAtacadoAccess();
  if (!ok) return <LinkExpirado whatsapp={config.whatsapp} />;

  const regra = await getRegraPrecoAtacado(config);

  return (
    <AtacadoProvider
      config={{ regra, minimoPecas: config.minimoPecas, whatsapp: config.whatsapp, aviso: config.aviso }}
    >
      <div className="min-h-screen bg-kc-light flex flex-col">
        <AtacadoHeader />
        <main className="flex-1">{children}</main>
        <footer className="py-6 text-center text-[11px] text-kc-muted">
          Kary Curadoria · Atacado · Rua Min. Firmino Whitaker, 49/55, Box 142 · Brás · São Paulo/SP
        </footer>
        <WhatsAppAtacadoFloat />
      </div>
    </AtacadoProvider>
  );
}
