"use client";

// Varukorgens tillstånd. Lagras i localStorage så korgen överlever
// sidladdningar. Endast slug + färgnamn + antal sparas — produktkatalogen
// (inkl. aktuellt lagersaldo) hämtas separat via GET /api/products, eftersom
// klientkod inte kan importera den fs-baserade produktbutiken direkt.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Colorway, Product } from "@/lib/products";

export interface CartItem {
  slug: string;
  colorName: string;
  quantity: number;
}

export interface CartLine {
  product: Product;
  colorway: Colorway;
  quantity: number;
  lineTotal: number;
}

interface CartContextValue {
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  addItem: (slug: string, colorName: string, quantity?: number) => void;
  setQuantity: (slug: string, colorName: string, quantity: number) => void;
  removeItem: (slug: string, colorName: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "garnladan-cart-v1";

function readStoredCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is CartItem =>
        typeof item?.slug === "string" &&
        typeof item?.colorName === "string" &&
        typeof item?.quantity === "number" &&
        item.quantity > 0
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(readStoredCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => (res.ok ? res.json() : { products: [] }))
      .then((data) => setCatalog(Array.isArray(data.products) ? data.products : []))
      .catch(() => setCatalog([]));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  // Lagersaldo för en färgvariant. Innan katalogen hunnit laddas returneras
  // Infinity (okänt lager) så vi inte felaktigt blockerar en tillagd vara.
  const getStock = useCallback(
    (slug: string, colorName: string): number => {
      const product = catalog.find((p) => p.slug === slug);
      const colorway = product?.colorways.find((c) => c.name === colorName);
      return colorway?.stock ?? Infinity;
    },
    [catalog]
  );

  const addItem = useCallback(
    (slug: string, colorName: string, quantity = 1) => {
      setItems((prev) => {
        const existing = prev.find(
          (i) => i.slug === slug && i.colorName === colorName
        );
        const stock = getStock(slug, colorName);
        if (existing) {
          const nextQuantity = Math.min(existing.quantity + quantity, stock);
          return prev.map((i) => (i === existing ? { ...i, quantity: nextQuantity } : i));
        }
        return [...prev, { slug, colorName, quantity: Math.min(quantity, stock) }];
      });
      setDrawerOpen(true);
    },
    [getStock]
  );

  const setQuantity = useCallback(
    (slug: string, colorName: string, quantity: number) => {
      setItems((prev) => {
        const capped = Math.min(quantity, getStock(slug, colorName));
        return capped <= 0
          ? prev.filter((i) => !(i.slug === slug && i.colorName === colorName))
          : prev.map((i) =>
              i.slug === slug && i.colorName === colorName
                ? { ...i, quantity: capped }
                : i
            );
      });
    },
    [getStock]
  );

  const removeItem = useCallback((slug: string, colorName: string) => {
    setItems((prev) =>
      prev.filter((i) => !(i.slug === slug && i.colorName === colorName))
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const lines = useMemo<CartLine[]>(() => {
    return items.flatMap((item) => {
      const product = catalog.find((p) => p.slug === item.slug);
      if (!product) return [];
      const colorway =
        product.colorways.find((c) => c.name === item.colorName) ??
        product.colorways[0];
      return [
        {
          product,
          colorway,
          quantity: item.quantity,
          lineTotal: product.price * item.quantity,
        },
      ];
    });
  }, [items, catalog]);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
      subtotal: lines.reduce((sum, l) => sum + l.lineTotal, 0),
      isDrawerOpen,
      openDrawer,
      closeDrawer,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
    }),
    [
      lines,
      isDrawerOpen,
      openDrawer,
      closeDrawer,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart måste användas inom <CartProvider>");
  return ctx;
}
