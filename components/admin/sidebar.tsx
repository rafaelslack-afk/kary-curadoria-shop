"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Layers,
  Warehouse,
  Tag,
  Users,
  BarChart3,
  LogOut,
  Palette,
  Ruler,
  LayoutTemplate,
  Menu,
  Home,
  ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { href: "/admin",            label: "Dashboard",  icon: LayoutDashboard },
  { href: "/admin/pedidos",    label: "Pedidos",    icon: ShoppingCart },
  { href: "/admin/produtos",   label: "Produtos",   icon: Package },
  { href: "/admin/estoque",    label: "Estoque",    icon: Warehouse },
  { href: "/admin/categorias", label: "Categorias", icon: Layers },
  { href: "/admin/cores",      label: "Cores",      icon: Palette },
  { href: "/admin/banners",    label: "Banners",    icon: LayoutTemplate },
  { href: "/admin/menus",      label: "Menus",      icon: Menu },
  { href: "/admin/home",       label: "Home",       icon: Home },
  { href: "/admin/tamanhos",   label: "Tamanhos",   icon: Ruler },
  { href: "/admin/cupons",     label: "Cupons",     icon: Tag },
  { href: "/admin/clientes",   label: "Clientes",   icon: Users },
  { href: "/admin/abandonos",  label: "Abandonos",  icon: ShoppingBag },
  { href: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
];

interface AdminSidebarProps {
  /**
   * Chamado ao clicar em qualquer link — usado pelo drawer mobile
   * para fechar a sidebar após a navegação.
   */
  onClose?: () => void;
}

export function AdminSidebar({ onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const [abandonosCount, setAbandonosCount] = useState<number | null>(null);

  // Contagem de abandonos não recuperados (últimos 7 dias)
  useEffect(() => {
    fetch("/api/admin/abandoned-checkouts?period=7d&status=abandoned")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setAbandonosCount(data.length); })
      .catch(() => {});
  }, []);

  return (
    // h-full + overflow-y-auto → menu rola dentro do drawer em telas curtas
    <div className="h-full flex flex-col overflow-y-auto">

      {/* Logo — oculto no mobile (o shell já exibe "Menu" no cabeçalho do drawer) */}
      <div className="hidden lg:block px-6 py-5 border-b border-white/10 shrink-0">
        <Link href="/admin" className="flex flex-col" onClick={onClose}>
          <span className="font-serif text-lg font-medium text-kc-cream tracking-[0.12em]">
            KVO
          </span>
          <span className="text-[10px] tracking-[0.2em] text-kc-muted">
            PAINEL ADMIN
          </span>
        </Link>
      </div>

      {/* Itens de navegação */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {menuItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(href);
          const isAbandonos = href === "/admin/abandonos";

          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                // py-3 garante ≥ 44px de altura — padrão de acessibilidade touch
                "flex items-center gap-3 px-3 py-3 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-kc/20 text-kc-cream"
                  : "text-kc-cream/60 hover:text-kc-cream hover:bg-white/5"
              )}
            >
              <Icon size={18} strokeWidth={1.5} className="shrink-0" />
              <span className="tracking-wide flex-1">{label}</span>
              {isAbandonos && abandonosCount !== null && abandonosCount > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                  {abandonosCount > 99 ? "99+" : abandonosCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Rodapé — Ver Loja + Sair */}
      <div className="shrink-0 px-3 py-3 border-t border-white/10">
        <Link
          href="/"
          target="_blank"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-3 text-sm text-kc-cream/60 hover:text-kc-cream transition-colors rounded-md hover:bg-white/5"
        >
          <Package size={18} strokeWidth={1.5} className="shrink-0" />
          <span className="tracking-wide">Ver Loja</span>
        </Link>
        <button
          className="flex items-center gap-3 px-3 py-3 text-sm text-kc-cream/60 hover:text-red-400 transition-colors w-full rounded-md hover:bg-white/5"
          onClick={() => {
            onClose?.();
            // Logout via Supabase Auth (a implementar)
          }}
        >
          <LogOut size={18} strokeWidth={1.5} className="shrink-0" />
          <span className="tracking-wide">Sair</span>
        </button>
      </div>
    </div>
  );
}
