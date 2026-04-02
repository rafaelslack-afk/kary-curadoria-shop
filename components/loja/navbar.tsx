"use client";

import Link from "next/link";
import { Search, ShoppingBag, Menu, X } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useCartStore } from "@/lib/store/cart";
import { formatCurrency } from "@/lib/utils";
import { buildWhatsAppUrl, INSTAGRAM_URL } from "@/lib/site";
import Image from "next/image";

interface SearchResult {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string | null;
}

interface NavLinkItem {
  id: string;
  label: string;
  href: string;
}

interface NavbarProps {
  navLinks: NavLinkItem[];
}

export function Navbar({ navLinks }: NavbarProps) {
  const totalItems = useCartStore((s) => s.totalItems());
  const [menuOpen, setMenuOpen] = useState(false);

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openSearch = () => {
    setSearchOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery("");
    setResults([]);
  };

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(value.trim())}`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 280);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        closeSearch();
      }
    }
    if (searchOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [searchOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeSearch();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <nav className="bg-kc-cream border-b border-kc-line sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">

        {/* Logo */}
        <Link href="/" className="flex flex-col shrink-0">
          <span className="font-serif text-2xl font-medium text-kc-dark tracking-[0.12em] leading-none">
            KARY
          </span>
          <span className="text-[11px] tracking-[0.28em] text-kc-muted">
            CURADORIA
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex gap-7">
          {navLinks.map(({ href, label }) => (
            <Link
              key={label}
              href={href}
              className="text-[13px] tracking-[0.16em] text-kc-muted hover:text-kc-dark transition-colors uppercase"
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {/* Social icons — desktop only */}
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="text-kc-muted hover:text-kc-dark transition-colors hidden md:block"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
            </svg>
          </a>
          <a
            href={buildWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp"
            className="text-kc-muted hover:text-kc-dark transition-colors hidden md:block"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.118 1.532 5.845L.057 23.716a.5.5 0 0 0 .608.625l5.926-1.51A11.944 11.944 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.956 0-3.792-.56-5.35-1.53l-.39-.24-4.04 1.03 1.03-3.95-.25-.41A9.941 9.941 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
            </svg>
          </a>

          {/* Search — desktop */}
          <div ref={searchRef} className="relative hidden md:block">
            {searchOpen ? (
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder="Buscar produtos..."
                  className="w-52 border-b border-kc-muted bg-transparent text-sm text-kc-dark placeholder:text-kc-muted/60 focus:outline-none focus:border-kc-dark py-0.5 transition-all"
                />
                <button
                  onClick={closeSearch}
                  aria-label="Fechar busca"
                  className="text-kc-muted hover:text-kc-dark transition-colors"
                >
                  <X size={15} strokeWidth={1.5} />
                </button>

                {/* Dropdown */}
                {(results.length > 0 || searching) && (
                  <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-kc-line rounded-lg shadow-lg overflow-hidden z-50">
                    {searching && results.length === 0 && (
                      <div className="px-4 py-3 text-xs text-kc-muted animate-pulse">
                        Buscando...
                      </div>
                    )}
                    {results.map((item) => (
                      <Link
                        key={item.id}
                        href={`/produtos/${item.slug}`}
                        onClick={closeSearch}
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-kc-light transition-colors border-b border-kc-line last:border-0"
                      >
                        <div className="w-10 h-10 shrink-0 bg-kc-light rounded overflow-hidden">
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-kc-dark truncate">{item.name}</p>
                          <p className="text-[11px] text-kc-muted">{formatCurrency(item.price)}</p>
                        </div>
                      </Link>
                    ))}
                    {!searching && results.length === 0 && query.trim().length >= 2 && (
                      <div className="px-4 py-3 text-xs text-kc-muted">
                        Nenhum produto encontrado.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={openSearch}
                aria-label="Buscar"
                className="text-kc-muted hover:text-kc-dark transition-colors"
              >
                <Search size={21} strokeWidth={1.5} />
              </button>
            )}
          </div>

          <Link
            href="/carrinho"
            aria-label={`Carrinho — ${totalItems} ${totalItems === 1 ? "item" : "itens"}`}
            className="relative text-kc-muted hover:text-kc-dark transition-colors"
          >
            <ShoppingBag size={21} strokeWidth={1.5} />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-kc text-white rounded-full w-[14px] h-[14px] text-[8px] font-medium flex items-center justify-center leading-none">
                {totalItems > 9 ? "9+" : totalItems}
              </span>
            )}
          </Link>

          {/* Mobile menu toggle */}
          <button
            aria-label="Menu"
            className="md:hidden text-kc-muted hover:text-kc-dark transition-colors"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X size={24} strokeWidth={1.5} /> : <Menu size={24} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-kc-line bg-kc-cream">
          {navLinks.map(({ href, label }) => (
            <Link
              key={label}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="block px-6 py-3.5 text-[13px] tracking-[0.16em] text-kc-muted hover:text-kc-dark hover:bg-kc-light transition-colors uppercase border-b border-kc-line last:border-0"
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
