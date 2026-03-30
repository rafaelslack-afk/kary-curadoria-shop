import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cep = searchParams.get("cep")?.replace(/\D/g, "");

  if (!cep || cep.length !== 8) {
    return NextResponse.json({ error: "CEP inválido. Informe 8 dígitos." }, { status: 400 });
  }

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      next: { revalidate: 86400 }, // cache 24h — endereços raramente mudam
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Erro ao consultar ViaCEP." }, { status: 502 });
    }

    const data = await res.json();

    if (data.erro) {
      return NextResponse.json({ error: "CEP não encontrado." }, { status: 404 });
    }

    return NextResponse.json({
      cep: data.cep,
      logradouro: data.logradouro,
      bairro: data.bairro,
      cidade: data.localidade,
      estado: data.uf,
    });
  } catch {
    return NextResponse.json({ error: "Falha ao consultar CEP." }, { status: 500 });
  }
}
