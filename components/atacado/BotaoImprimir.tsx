"use client";

import { Printer } from "lucide-react";

export function BotaoImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden inline-flex items-center gap-2 rounded-lg bg-kc-dark text-white px-4 py-2 text-sm hover:bg-kc transition-colors"
    >
      <Printer size={16} />
      Imprimir
    </button>
  );
}
