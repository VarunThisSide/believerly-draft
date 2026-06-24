"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ── Types ─────────────────────────────────────────────────────────

export interface CartItem {
  id: string;           // productId
  name: string;
  price: number;        // stored as plain number for arithmetic
  image: string | null;
  quantity: number;
  stock: number;        // max purchasable quantity
}

interface CartState {
  items: CartItem[];
  // ── Derived ────────────────────────────────────────────────────
  totalItems: () => number;
  totalPrice: () => number;
  // ── Actions ────────────────────────────────────────────────────
  addItem: (product: Omit<CartItem, "quantity">) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
}

// ── Store ─────────────────────────────────────────────────────────

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      // ── Derived ──────────────────────────────────────────────
      totalItems: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),

      totalPrice: () =>
        get().items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        ),

      // ── Actions ──────────────────────────────────────────────
      addItem: (product) =>
        set((state) => {
          const existing = state.items.find((i) => i.id === product.id);

          if (existing) {
            // Increment but cap at stock
            return {
              items: state.items.map((i) =>
                i.id === product.id
                  ? {
                      ...i,
                      quantity: Math.min(i.quantity + 1, product.stock),
                    }
                  : i
              ),
            };
          }

          // New item
          return {
            items: [...state.items, { ...product, quantity: 1 }],
          };
        }),

      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== productId),
        })),

      updateQuantity: (productId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return { items: state.items.filter((i) => i.id !== productId) };
          }
          return {
            items: state.items.map((i) =>
              i.id === productId
                ? { ...i, quantity: Math.min(quantity, i.stock) }
                : i
            ),
          };
        }),

      clearCart: () => set({ items: [] }),
    }),
    {
      name: "cart-storage",           // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Only persist the items array; derived functions are re-created
      partialize: (state) => ({ items: state.items }),
    }
  )
);

// ── SSR-safe hook (prevents hydration mismatch) ───────────────────
// Use this hook in components instead of useCartStore directly
// when you need to read cart state on the client.

import { useEffect, useState } from "react";

export function useHydratedCart() {
  const [hydrated, setHydrated] = useState(false);
  const cart = useCartStore();

  useEffect(() => {
    setHydrated(true);
  }, []);

  return { ...cart, hydrated };
}