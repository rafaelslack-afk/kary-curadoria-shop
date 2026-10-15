"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useAtacadoConfig } from "@/components/atacado/AtacadoProvider";
import { AvisoNovidades } from "@/components/atacado/AvisoNovidades";
import { SeletorPagamento, useFormaPagamento } from "@/components/atacado/SeletorPagamento";
import { precoAtacado, precoPlusSizeCard } from "@/lib/atacado/pricing";
import { formatCurrency } from "@/lib/utils";
import type { AtacadoProduct } from "@/lib/atacado/types";
import { consumirRestauracao, salvarCatalogo } from "@/lib/atacado/navegacao";

function norm(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

interface Props {
  products: AtacadoProduct[];
  categoriaInicial?: string;
  buscaInicial?: string;
}

export function CatalogoAtacado({ products, categoriaInicial = "", buscaInicial = "" }: Props) {
  const { regra } = useAtacadoConfig();
  const forma = useFormaPagamento();
  const [categoria, setCategoria] = useState(() =>
    products.some((p) => p.category?.slug === categoriaInicial) ? categoriaInicial : ""
  );
  const [busca, setBusca] = useState(buscaInicial);
  const primeiraVez = useRef(true);

  // Categoria e busca ficam na URL (replaceState: sem recarregar) e no
  // sessionStorage, para "Voltar ao catálogo" reabrir como a lojista deixou.
  useEffect(() => {
    const params = new URLSearchParams();
    if (categoria) params.set("categoria", categoria);
    if (busca.trim()) params.set("busca", busca.trim());
    const qs = params.toString();
    salvarCatalogo({ qs });
    if (primeiraVez.current) {
      primeiraVez.current = false;
      return;
    }
    const t = setTimeout(() => {
      window.history.replaceState(window.history.state, "", qs ? `/atacado?${qs}` : "/atacado");
    }, 300);
    return () => clearTimeout(t);
  }, [categoria, busca]);

  // Rolagem: restaura quando a lojista volta pelos botões; senão começa do topo
  useEffect(() => {
    const y = consumirRestauracao();
    if (y != null) requestAnimationFrame(() => window.scrollTo(0, y));
    else salvarCatalogo({ scrollY: 0 });

    let t: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => salvarCatalogo({ scrollY: window.scrollY }), 120);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (t) clearTimeout(t);
    };
  }, []);

  const categorias = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products) if (p.category) map.set(p.category.slug, p.category.name);
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [products]);

  const filtrados = useMemo(() => {
    const q = norm(busca.trim());
    return products.filter(
      (p) =>
        (!categoria || p.category?.slug === categoria) &&
        (!q || norm(p.name).includes(q) || norm(p.reference ?? "").replace(/[\s-]/g, "").includes(q.replace(/[\s-]/g, "")))
    );
  }, [products, categoria, busca]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
      <h1 className="font-serif text-3xl sm:text-4xl text-kc-dark mb-4">Catálogo Atacado</h1>

      {/* Aviso de novidades: logo abaixo do título e acima do seletor */}
      <div className="mb-4">
        <AvisoNovidades />
      </div>

      <div className="mb-6">
        <SeletorPagamento />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <label className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-kc-muted" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou referência"
            className="w-full border border-kc-line bg-white rounded-lg pl-9 pr-3 py-2.5 text-sm text-kc-dark placeholder:text-kc-muted focus:outline-none focus:border-kc"
          />
        </label>
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          aria-label="Categoria"
          className="border border-kc-line bg-white rounded-lg px-3 py-2.5 text-sm text-kc-dark focus:outline-none focus:border-kc"
        >
          <option value="">Todas as categorias</option>
          {categorias.map(([slug, name]) => (
            <option key={slug} value={slug}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-kc-muted mb-4">{filtrados.length} peças</p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
        {filtrados.map((p) => {
          const preco = precoAtacado(p.price, "", forma, regra);
          const plus = precoPlusSizeCard(p.price, p.variants.map((v) => v.size), forma, regra);
          return (
            <Link
              key={p.id}
              href={`/atacado/produto/${p.slug}`}
              prefetch={false}
              onClick={() => salvarCatalogo({ scrollY: window.scrollY })}
              className="group bg-white border border-kc-line rounded-lg overflow-hidden flex flex-col"
            >
              <div className="aspect-[3/4] bg-kc-cream overflow-hidden">
                {p.images[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.images[0]}
                    alt={p.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                  />
                )}
              </div>
              <div className="p-3 flex flex-col gap-1 flex-1">
                <p className="text-[13px] text-kc-dark leading-snug line-clamp-2">{p.name}</p>
                {p.reference && <p className="text-[10px] tracking-[0.12em] text-kc-muted">REF. {p.reference}</p>}
                <p className="mt-auto pt-1 text-sm font-medium text-kc">{formatCurrency(preco)}</p>
                {plus && (
                  <p className="text-[11px] text-kc-dark/70 -mt-0.5">
                    {plus.label}: {plus.from ? "a partir de " : ""}
                    {formatCurrency(plus.price)}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {filtrados.length === 0 && (
        <p className="text-center text-sm text-kc-muted py-16">Nenhuma peça encontrada.</p>
      )}
    </div>
  );
}
