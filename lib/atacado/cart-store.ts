// Carrinho do ATACADO. Armazenamento próprio ("kvo-atacado-cart"), separado
// do carrinho da loja ("kvo-cart" em lib/store/cart.ts): os dois nunca se
// misturam. Guarda só o que a cliente escolheu; preços são sempre calculados
// a partir do preço de varejo com a regra de atacado (e recalculados no
// servidor no envio).
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FormaPagamentoAtacado } from "@/lib/atacado/pricing";

export interface AtacadoCartItem {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  reference: string | null;
  image: string | null;
  color: string;
  size: string;
  retailPrice: number; // preço de varejo atual do produto (base do cálculo)
  quantity: number;
}

interface AtacadoCartState {
  items: AtacadoCartItem[];
  formaPagamento: FormaPagamentoAtacado;
  setFormaPagamento: (f: FormaPagamentoAtacado) => void;
  // Soma quantidades (adicionar ao pedido)
  addItems: (items: AtacadoCartItem[]) => void;
  // Define a quantidade (0 remove)
  setQuantity: (variantId: string, quantity: number) => void;
  removeProduct: (productId: string) => void;
  clear: () => void;
}

export const MAX_QTD_POR_ITEM = 999;

export const useAtacadoCart = create<AtacadoCartState>()(
  persist(
    (set) => ({
      items: [],
      formaPagamento: "pix",
      setFormaPagamento: (formaPagamento) => set({ formaPagamento }),
      addItems: (novos) =>
        set((state) => {
          const items = [...state.items];
          for (const n of novos) {
            if (n.quantity <= 0) continue;
            const i = items.findIndex((it) => it.variantId === n.variantId);
            if (i >= 0) {
              items[i] = {
                ...n,
                quantity: Math.min(items[i].quantity + n.quantity, MAX_QTD_POR_ITEM),
              };
            } else {
              items.push({ ...n, quantity: Math.min(n.quantity, MAX_QTD_POR_ITEM) });
            }
          }
          return { items };
        }),
      setQuantity: (variantId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((it) => it.variantId !== variantId)
              : state.items.map((it) =>
                  it.variantId === variantId ? { ...it, quantity: Math.min(quantity, MAX_QTD_POR_ITEM) } : it
                ),
        })),
      removeProduct: (productId) =>
        set((state) => ({ items: state.items.filter((it) => it.productId !== productId) })),
      clear: () => set({ items: [] }),
    }),
    { name: "kvo-atacado-cart" }
  )
);
