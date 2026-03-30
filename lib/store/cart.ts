import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppliedCoupon } from "@/lib/coupons";

export interface CartItem {
  variantId: string;
  productId: string;
  productName: string;
  slug: string;
  size: string;
  color: string | null;
  sku: string;
  price: number;
  image: string | null;
  quantity: number;
  weight_g?: number | null;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
}

interface CartStore {
  items: CartItem[];
  coupon: AppliedCoupon | null;
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  setCoupon: (coupon: AppliedCoupon | null) => void;
  clearCoupon: () => void;
  clearCart: () => void;
  totalItems: () => number;
  subtotal: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      coupon: null,

      addItem: (newItem) => {
        set((state) => {
          const existing = state.items.find(
            (i) => i.variantId === newItem.variantId
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === newItem.variantId
                  ? { ...i, quantity: i.quantity + (newItem.quantity ?? 1) }
                  : i
              ),
            };
          }
          return {
            items: [
              ...state.items,
              { ...newItem, quantity: newItem.quantity ?? 1 },
            ],
          };
        });
      },

      removeItem: (variantId) => {
        set((state) => {
          const items = state.items.filter((i) => i.variantId !== variantId);
          return {
            items,
            coupon: items.length === 0 ? null : state.coupon,
          };
        });
      },

      updateQuantity: (variantId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(variantId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.variantId === variantId ? { ...i, quantity } : i
          ),
        }));
      },

      setCoupon: (coupon) => set({ coupon }),
      clearCoupon: () => set({ coupon: null }),

      clearCart: () => set({ items: [], coupon: null }),

      totalItems: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),

      subtotal: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    {
      name: "kvo-cart",
    }
  )
);
