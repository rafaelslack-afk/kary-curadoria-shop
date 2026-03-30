"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/pedidos",
    label: "Pedidos",
    icon: ShoppingCart,
  },
  {
    href: "/admin/produtos",
    label: "Produtos",
    icon: Package,
  },
  {
    href: "/admin/estoque",
    label: "Estoque",
    icon: Warehouse,
  },
  {
    href: "/admin/categorias",
    label: "Categorias",
    icon: Layers,
  },
  {
    href: "/admin/cores",
    label: "Cores",
    icon: Palette,
  },
  {
    href: "/admin/banners",
    label: "Banners",
    icon: LayoutTemplate,
  },
  {
    href: "/admin/tamanhos",
    label: "Tamanhos",
    icon: Ruler,
  },
  {
    href: "/admin/cupons",
    label: "Cupons",
    icon: Tag,
  },
  {
    href: "/admin/clientes",
    label: "Clientes",
    icon: Users,
  },
  {
    href: "/admin/relatorios",
    label: "Relatórios",
    icon: BarChart3,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-kc-dark min-h-screen flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <Link href="/admin" className="flex flex-col">
          <span className="font-serif text-lg font-medium text-kc-cream tracking-[0.12em]">
            KVO
          </span>
          <span className="text-[10px] tracking-[0.2em] text-kc-muted">
            PAINEL ADMIN
          </span>
        </Link>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {menuItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-kc/20 text-kc-cream"
                  : "text-kc-cream/60 hover:text-kc-cream hover:bg-white/5"
              )}
            >
              <Icon size={18} strokeWidth={1.5} />
              <span className="tracking-wide">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/10">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 text-sm text-kc-cream/60 hover:text-kc-cream transition-colors"
          target="_blank"
        >
          <Package size={18} strokeWidth={1.5} />
          <span className="tracking-wide">Ver Loja</span>
        </Link>
        <button
          className="flex items-center gap-3 px-3 py-2.5 text-sm text-kc-cream/60 hover:text-red-400 transition-colors w-full"
          onClick={() => {
            // Logout será implementado com Supabase Auth
          }}
        >
          <LogOut size={18} strokeWidth={1.5} />
          <span className="tracking-wide">Sair</span>
        </button>
      </div>
    </aside>
  );
}
