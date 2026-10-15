import { getAtacadoCatalogo } from "@/lib/atacado/catalogo";
import { CatalogoAtacado } from "@/components/atacado/CatalogoAtacado";

export const dynamic = "force-dynamic";

export default async function AtacadoCatalogoPage({
  searchParams,
}: {
  searchParams: { categoria?: string; busca?: string };
}) {
  let products: Awaited<ReturnType<typeof getAtacadoCatalogo>> = [];
  try {
    products = await getAtacadoCatalogo();
  } catch {
    return (
      <p className="max-w-6xl mx-auto px-6 py-16 text-center text-sm text-kc-dark/70">
        Não foi possível carregar o catálogo agora. Tente de novo em instantes ou fale com a nossa equipe pelo WhatsApp.
      </p>
    );
  }
  // Descrição só na página do produto: deixa o HTML do catálogo leve
  // Categoria e busca vêm da URL: "Voltar ao catálogo" reabre como a lojista deixou
  const categoria = typeof searchParams.categoria === "string" ? searchParams.categoria : "";
  const busca = typeof searchParams.busca === "string" ? searchParams.busca.slice(0, 80) : "";
  return (
    <CatalogoAtacado
      products={products.map((p) => ({ ...p, description: null }))}
      categoriaInicial={categoria}
      buscaInicial={busca}
    />
  );
}
