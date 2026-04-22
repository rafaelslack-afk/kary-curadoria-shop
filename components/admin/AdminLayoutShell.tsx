"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { AdminSidebar } from "@/components/admin/sidebar";

interface AdminLayoutShellProps {
  children: React.ReactNode;
}

/**
 * Shell client-side do layout admin.
 *
 * Responsabilidades:
 * - Desktop (lg+): sidebar sempre visível, sem overhead
 * - Tablet/Mobile (< lg): header fixo com botão hamburguer,
 *   sidebar como drawer animado com overlay semitransparente
 *
 * Separado do layout.tsx (Server Component) para preservar
 * o `export const metadata` nele.
 */
export function AdminLayoutShell({ children }: AdminLayoutShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Fecha o drawer ao navegar para qualquer rota
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Bloqueia scroll do body quando drawer aberto (mobile)
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── HEADER MOBILE — visível apenas abaixo de lg ──────────────────── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-[#5C3317] flex items-center justify-between px-4 shadow-md">
        <span className="text-white font-medium text-sm tracking-widest font-['Jost']">
          Kary Admin
        </span>
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Abrir menu"
          className="text-white p-2 -mr-2 rounded-md hover:bg-white/10 transition-colors"
        >
          <Menu size={22} />
        </button>
      </header>

      {/* ── OVERLAY — aparece atrás do drawer em mobile/tablet ───────────── */}
      <div
        aria-hidden="true"
        onClick={() => setSidebarOpen(false)}
        className={[
          "lg:hidden fixed inset-0 z-40 bg-black/50",
          "transition-opacity duration-300",
          sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        ].join(" ")}
      />

      {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
      <aside
        className={[
          // Posicionamento e dimensões
          "fixed top-0 left-0 h-full z-50 w-64",
          // Aparência
          "bg-kc-dark shadow-xl",
          // Animação de slide
          "transform transition-transform duration-300 ease-in-out",
          // Mobile/tablet: abre/fecha; desktop: sempre visível
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0 lg:shadow-none",
        ].join(" ")}
      >
        {/* Cabeçalho do drawer (apenas mobile/tablet) */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="text-kc-cream font-medium text-sm tracking-widest font-['Jost']">
            Menu
          </span>
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Fechar menu"
            className="text-kc-cream/70 p-1.5 rounded-md hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Conteúdo da sidebar (links, logo, footer) */}
        <AdminSidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* ── CONTEÚDO PRINCIPAL ───────────────────────────────────────────── */}
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>

    </div>
  );
}
