// Links e mensagens de WhatsApp do ATACADO. O número vem de
// system_config.atacado_whatsapp e é diferente do número da loja
// (lib/site.ts), que não deve ser usado aqui.
import { SITE_URL } from "@/lib/site";
import { formatCurrency } from "@/lib/utils";

export const MENSAGEM_NOVIDADES =
  "Olá! Vim pelo catálogo de atacado e quero receber fotos, vídeos e informações dos lançamentos e novidades.";

export function buildAtacadoWhatsAppUrl(numero: string, mensagem?: string): string {
  const n = numero.replace(/\D/g, "");
  return mensagem ? `https://wa.me/${n}?text=${encodeURIComponent(mensagem)}` : `https://wa.me/${n}`;
}

// Intl usa espaço não separável depois de "R$"; na mensagem do WhatsApp vai
// espaço comum para não aparecer caractere estranho em nenhum aparelho.
function money(v: number): string {
  return formatCurrency(v).replace(/ /g, " ");
}

export function romaneioUrl(romaneioToken: string): string {
  return `${SITE_URL}/atacado/romaneio/${romaneioToken}`;
}

export function mensagemPedidoAtacado(p: {
  orderNumber: string;
  customerName: string;
  storeName: string | null;
  document: string;
  cidade: string;
  uf: string;
  formaPagamento: string;
  pieces: number;
  itemsTotal: number;
  romaneioToken: string;
}): string {
  return [
    `Olá! Novo pedido de atacado ${p.orderNumber}`,
    `Cliente: ${p.customerName}${p.storeName ? ` (${p.storeName})` : ""}`,
    `CPF/CNPJ: ${p.document}`,
    `Cidade: ${p.cidade}/${p.uf}`,
    `Pagamento: ${p.formaPagamento}`,
    `Total de peças: ${p.pieces}`,
    `Total sem frete: ${money(p.itemsTotal)}`,
    `Romaneio completo:`,
    romaneioUrl(p.romaneioToken),
  ].join("\n");
}
