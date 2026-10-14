import { getAtacadoCatalogo } from "@/lib/atacado/catalogo";
import { CatalogoAtacado } from "@/components/atacado/CatalogoAtacado";

export const dynamic = "force-dynamic";

export default async function AtacadoCatalogoPage() {
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
  return <CatalogoAtacado products={products.map((p) => ({ ...p, description: null }))} />;
}
