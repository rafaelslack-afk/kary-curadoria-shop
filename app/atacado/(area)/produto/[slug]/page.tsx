import Link from "next/link";
import { getAtacadoProduto } from "@/lib/atacado/catalogo";
import { ProdutoAtacado } from "@/components/atacado/ProdutoAtacado";

export const dynamic = "force-dynamic";

export default async function AtacadoProdutoPage({ params }: { params: { slug: string } }) {
  const product = await getAtacadoProduto(params.slug).catch(() => null);
  if (!product) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-16 text-center">
        <p className="text-sm text-kc-dark/70 mb-4">Peça não encontrada.</p>
        <Link href="/atacado" prefetch={false} className="text-sm text-kc underline underline-offset-2">
          Voltar ao catálogo
        </Link>
      </div>
    );
  }
  return <ProdutoAtacado product={product} />;
}
