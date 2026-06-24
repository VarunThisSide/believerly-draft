"use client";

import { useEffect, useState } from "react";
import { useCartStore } from "@/store/useCartStore";
import type { StoreApi, UseBoundStore } from "zustand";

type ExtractState<S> = S extends UseBoundStore<StoreApi<infer T>> ? T : never;

/**
 * Hydration-safe cart selector hook.
 *
 * Zustand persisted stores are populated on the client after hydration.
 * Reading them during SSR returns the initial (empty) state, which causes
 * a mismatch when the client immediately renders the persisted value.
 *
 * This hook returns the initial state on the first render and only switches
 * to the real Zustand value once the component has mounted, eliminating
 * the hydration warning.
 *
 * Usage:
 *   const itemCount = useHydratedCart((s) => s.totalItems);
 */
export function useHydratedCart<T>(
  selector: (state: ExtractState<typeof useCartStore>) => T
): T {
  const storeValue = useCartStore(selector);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Before hydration, return a sensible zero-state for the selected slice.
  // This cast is safe because callers will always compare against the real value after mount.
  if (!hydrated) {
    const initial = useCartStore.getInitialState();
    return selector(initial);
  }

  return storeValue;
}

/**
 * Returns `true` only after the cart store has hydrated on the client.
 * Useful for conditionally rendering cart-dependent UI.
 */
export function useCartHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);
  return hydrated;
}
