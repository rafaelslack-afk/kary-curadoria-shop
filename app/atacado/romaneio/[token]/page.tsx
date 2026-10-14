import { notFound } from "next/navigation";
import { getWholesaleOrderByRomaneio } from "@/lib/atacado/pedidos";
import { getAtacadoConfig } from "@/lib/atacado/config";
import { labelFormaPagamento } from "@/lib/atacado/pricing";
import { formatarDocumento } from "@/lib/atacado/documento";
import { statusAtacadoInfo } from "@/lib/atacado/status";
import { formatCurrency, formatDateTime, formatPhone, formatCEP } from "@/lib/utils";
import { BotaoImprimir } from "@/components/atacado/BotaoImprimir";

// Romaneio do pedido de atacado. Acesso só pelo romaneio_token (sem o cookie
// do catálogo); noindex herdado de app/atacado/layout.tsx; página dinâmica,
// sem cache público. Sempre lê o pedido atual, então reflete as edições do admin.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RomaneioPage({ params }: { params: { token: string } }) {
  const [order, config] = await Promise.all([getWholesaleOrderByRomaneio(params.token), getAtacadoConfig()]);
  if (!order) notFound();

  const a = order.address_json;
  const shipping = order.shipping_cost ?? null;

  return (
    <main className="romaneio bg-white min-h-screen text-[#2b1a0e]">
      <style>{`
        @page { size: A4; margin: 14mm 12mm; }
        @media print {
          html, body { background: #fff !important; }
          .romaneio { font-size: 11px; }
          .romaneio table { page-break-inside: auto; }
          .romaneio tr { page-break-inside: avoid; }
        }
      `}</style>

      <div className="max-w-[800px] mx-auto px-6 py-8 print:p-0">
        <div className="flex items-start justify-between gap-4 border-b border-[#A0622A]/30 pb-4 mb-5">
          <div>
            <p className="font-serif text-2xl tracking-[0.12em] text-[#5C3317]">KARY CURADORIA</p>
            <p className="text-[11px] text-[#5C3317]/70 mt-1 leading-snug">
              Rua Min. Firmino Whitaker, 49/55, Box 142 · Brás · São Paulo/SP · CEP 03027-000
              <br />
              WhatsApp atacado: {formatPhone(config.whatsapp.replace(/^55/, ""))} · karycuradoria.com.br
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#5C3317]/60">Romaneio</p>
            <p className="text-xl font-semibold text-[#5C3317]">{order.order_number}</p>
            <p className="text-[11px] text-[#5C3317]/70">{formatDateTime(order.created_at)}</p>
            <p className="text-[11px] text-[#5C3317]/70">Status: {statusAtacadoInfo(order.status).label}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 print:grid-cols-2 gap-4 mb-5 text-[12px]">
          <div>
            <p className="text-[10px] tracking-[0.16em] uppercase text-[#5C3317]/60 mb-1">Cliente</p>
            <p className="font-medium">{order.customer_name}</p>
            {order.store_name && <p>{order.store_name}</p>}
            <p>CPF/CNPJ: {formatarDocumento(order.document)}</p>
            <p>Telefone: {formatPhone(order.phone)}</p>
            <p>{order.email}</p>
          </div>
          <div>
            <p className="text-[10px] tracking-[0.16em] uppercase text-[#5C3317]/60 mb-1">Entrega</p>
            <p>
              {a.logradouro}, {a.numero}
              {a.complemento ? ` · ${a.complemento}` : ""}
            </p>
            <p>
              {a.bairro} · {a.cidade}/{a.uf}
            </p>
            <p>CEP {formatCEP(a.cep)}</p>
            <p className="mt-2">
              <span className="text-[#5C3317]/60">Pagamento:</span> {labelFormaPagamento(order.payment_method)}
            </p>
          </div>
        </div>

        <table className="w-full text-[12px] border-collapse">
          <thead>
            <tr className="border-b-2 border-[#5C3317]/40 text-left text-[10px] uppercase tracking-[0.1em] text-[#5C3317]/70">
              <th className="py-1.5 pr-2 font-medium">Ref.</th>
              <th className="py-1.5 pr-2 font-medium">Produto</th>
              <th className="py-1.5 pr-2 font-medium">Cor</th>
              <th className="py-1.5 pr-2 font-medium">Tam.</th>
              <th className="py-1.5 pr-2 font-medium text-right">Qtd.</th>
              <th className="py-1.5 pr-2 font-medium text-right">Unitário</th>
              <th className="py-1.5 font-medium text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it) => (
              <tr key={it.id} className="border-b border-[#5C3317]/15 align-top">
                <td className="py-1.5 pr-2 whitespace-nowrap">{it.reference ?? "—"}</td>
                <td className="py-1.5 pr-2">{it.product_name}</td>
                <td className="py-1.5 pr-2">{it.color ?? "—"}</td>
                <td className="py-1.5 pr-2">{it.size ?? "—"}</td>
                <td className="py-1.5 pr-2 text-right">{it.quantity}</td>
                <td className="py-1.5 pr-2 text-right whitespace-nowrap">{formatCurrency(it.unit_price)}</td>
                <td className="py-1.5 text-right whitespace-nowrap">{formatCurrency(it.total_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 ml-auto w-full sm:w-72 print:w-72 text-[12px] space-y-1">
          <div className="flex justify-between">
            <span>Total de peças</span>
            <span>{order.pieces_count}</span>
          </div>
          <div className="flex justify-between">
            <span>Total sem frete</span>
            <span>{formatCurrency(order.items_total)}</span>
          </div>
          <div className="flex justify-between">
            <span>Frete</span>
            <span>{shipping === null ? "a calcular" : formatCurrency(shipping)}</span>
          </div>
          <div className="flex justify-between border-t border-[#5C3317]/40 pt-1 font-semibold text-[13px]">
            <span>Total geral</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </div>

        {order.notes && (
          <div className="mt-5 text-[12px]">
            <p className="text-[10px] tracking-[0.16em] uppercase text-[#5C3317]/60 mb-1">Observações</p>
            <p className="whitespace-pre-line">{order.notes}</p>
          </div>
        )}

        <div className="mt-8 flex justify-end">
          <BotaoImprimir />
        </div>
      </div>
    </main>
  );
}
