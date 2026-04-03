import Link from "next/link";
import Image from "next/image";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/types/database";

interface ProductCardProps {
  product: Product & { total_stock?: number };
  isNew?: boolean;
}

export function ProductCard({ product, isNew }: ProductCardProps) {
  const hasDiscount =
    product.original_price && product.original_price > product.price;
  const firstImage = product.images?.[0] ?? null;
  const secondImage = product.images?.[1] ?? null;

  return (
    <Link
      href={`/produtos/${product.slug}`}
      className="group bg-kc-light border border-kc-line hover:border-kc-muted transition-colors block"
    >
      {/* Image */}
      <div className="relative w-full aspect-[3/4] bg-kc-cream overflow-hidden">
        {firstImage ? (
          <>
            <Image
              src={firstImage}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className={`object-cover transition-all duration-500 ${secondImage ? "group-hover:opacity-0 group-hover:scale-103" : "group-hover:scale-103"}`}
            />
            {secondImage && (
              <Image
                src={secondImage}
                alt={`${product.name} detalhe`}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover opacity-0 scale-[1.03] transition-all duration-500 group-hover:opacity-100 group-hover:scale-100"
              />
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-30">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="8" y="2" width="16" height="28" rx="1" stroke="currentColor" strokeWidth="1" />
              <line x1="8" y1="14" x2="24" y2="14" stroke="currentColor" strokeWidth="0.8" />
            </svg>
            <span className="text-[8px] tracking-[0.2em] text-kc-muted">FOTO</span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
          {isNew && (
            <span className="bg-kc text-white text-[8px] tracking-[0.14em] px-2 py-0.5 font-medium">
              NOVO
            </span>
          )}
          {hasDiscount && (
            <span className="bg-kc-dark text-kc-cream text-[8px] tracking-[0.1em] px-2 py-0.5">
              {Math.round(
                (1 - product.price / product.original_price!) * 100
              )}
              % OFF
            </span>
          )}
        </div>

        {/* Out of stock overlay */}
        {product.total_stock === 0 && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
            <span className="text-[10px] tracking-[0.18em] text-kc-dark bg-white/90 px-3 py-1">
              SEM ESTOQUE
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-serif text-[14px] font-medium text-kc-dark leading-snug mb-1.5 group-hover:text-kc transition-colors line-clamp-2">
          {product.name}
        </h3>
        <div className="flex items-baseline gap-1.5">
          {hasDiscount && (
            <span className="text-[11px] text-kc-muted line-through">
              {formatCurrency(product.original_price!)}
            </span>
          )}
          <span className="text-sm font-medium text-kc">
            {formatCurrency(product.price)}
          </span>
        </div>
      </div>
    </Link>
  );
}
