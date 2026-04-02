import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// ── Melhor Envio — Cálculo de frete ──────────────────────────────────────────
// Docs: https://docs.melhorenvio.com.br/reference/calculo-de-frete-por-produto
// POST /api/v2/me/shipment/calculate
// ─────────────────────────────────────────────────────────────────────────────

const ME_ENV = process.env.MELHORENVIO_ENV ?? "sandbox";
const ME_BASE =
  ME_ENV === "sandbox"
    ? "https://sandbox.melhorenvio.com.br/api/v2"
    : "https://melhorenvio.com.br/api/v2";

function getToken(): string {
  const token =
    ME_ENV === "sandbox"
      ? process.env.MELHORENVIO_TOKEN_SANDBOX
      : process.env.MELHORENVIO_TOKEN_PRODUCTION;

  if (!token) {
    throw new Error(
      `MELHORENVIO_TOKEN_${ME_ENV.toUpperCase()} não configurado.`
    );
  }
  return token;
}

interface ProdutoInput {
  peso_g: number;
  comprimento_cm: number;
  largura_cm: number;
  altura_cm: number;
  quantity: number;
}

interface ShippingInput {
  cepDestino: string;
  produtos: ProdutoInput[];
}

export interface ShippingOption {
  id: number;
  name: string;
  company: string;
  preco: number;           // R$ (número)
  prazo: number;           // dias úteis
}

// Fallback mock quando a API do ME não responde
function mockOptions(cepDestino: string): ShippingOption[] {
  console.warn(`[melhorenvio] API indisponível para ${cepDestino} — retornando frete mockado`);
  return [
    { id: 1, name: "PAC", company: "Correios", preco: 18.9,  prazo: 8 },
    { id: 2, name: "SEDEX", company: "Correios", preco: 34.5, prazo: 3 },
  ];
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ShippingInput;
    const { cepDestino, produtos } = body;

    if (!cepDestino || cepDestino.replace(/\D/g, "").length !== 8) {
      return NextResponse.json({ error: "CEP de destino inválido." }, { status: 400 });
    }

    if (!produtos?.length) {
      return NextResponse.json({ error: "Lista de produtos não informada." }, { status: 400 });
    }

    const cepOrigem = (process.env.MELHORENVIO_CEP_ORIGEM ?? "03012020").replace(/\D/g, "");

    const meProducts = produtos.map((p) => ({
      weight: Math.max(p.peso_g / 1000, 0.1),   // kg, mínimo 100g
      width:  Math.max(p.largura_cm, 11),
      height: Math.max(p.altura_cm, 2),
      length: Math.max(p.comprimento_cm, 16),
      quantity: p.quantity,
    }));

    let data: unknown[];
    try {
      const res = await fetch(`${ME_BASE}/me/shipment/calculate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
          "User-Agent": "Aplicação KVO (contato@karycuradoria.com.br)",
          Accept: "application/json",
        },
        body: JSON.stringify({
          from: { postal_code: cepOrigem },
          to:   { postal_code: cepDestino.replace(/\D/g, "") },
          products: meProducts,
          options: { receipt: false, own_hand: false },
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.warn(`[melhorenvio] API retornou ${res.status}: ${text}`);
        return NextResponse.json({ opcoes: mockOptions(cepDestino) });
      }

      data = await res.json() as unknown[];
    } catch (err) {
      console.warn("[melhorenvio] Falha na requisição:", (err as Error).message);
      return NextResponse.json({ opcoes: mockOptions(cepDestino) });
    }

    // Filtra apenas serviços dos Correios (company.id === 1 ou nome contém "correios")
    const CORREIOS_COMPANY_ID = 1;
    const allValid = (data as Record<string, unknown>[]).filter((s) => !s.error);
    const correiosOnly = allValid.filter((s) => {
      const company = s.company as { id?: number; name?: string } | undefined;
      return (
        company?.id === CORREIOS_COMPANY_ID ||
        company?.name?.toLowerCase().includes("correios")
      );
    });
    // Fallback: se nenhum serviço dos Correios disponível, usa todos
    const filtered = correiosOnly.length > 0 ? correiosOnly : allValid;

    const opcoes: ShippingOption[] = filtered
      .map((s) => ({
        id: s.id as number,
        name: s.name as string,
        company: (s.company as { name: string } | undefined)?.name ?? "Transportadora",
        preco: parseFloat(String(s.custom_price ?? s.price ?? 0)),
        prazo: Number(s.custom_delivery_time ?? s.delivery_time ?? 10),
      }))
      .filter((s) => s.preco > 0)
      .sort((a, b) => a.preco - b.preco);

    if (opcoes.length === 0) {
      return NextResponse.json({ opcoes: mockOptions(cepDestino) });
    }

    return NextResponse.json({ opcoes });
  } catch (err) {
    console.error("[melhorenvio] Erro interno:", err);
    return NextResponse.json(
      { error: `Erro interno: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
