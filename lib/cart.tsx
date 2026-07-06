"use client";

// Varukorgens tillstånd. Lagras i localStorage så korgen överlever
// sidladdningar. Endast slug + färgnamn + antal sparas — produktdata slås
// alltid upp färskt via lib/products så priser aldrig blir inaktuella.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getProductBySlug, type Colorway, type Product } from "@/lib/products";

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
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(readStoredCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addItem = useCallback(
    (slug: string, colorName: string, quantity = 1) => {
      setItems((prev) => {
        const existing = prev.find(
          (i) => i.slug === slug && i.colorName === colorName
        );
        if (existing) {
          return prev.map((i) =>
            i === existing ? { ...i, quantity: i.quantity + quantity } : i
          );
        }
        return [...prev, { slug, colorName, quantity }];
      });
      setDrawerOpen(true);
    },
    []
  );

  const setQuantity = useCallback(
    (slug: string, colorName: string, quantity: number) => {
      setItems((prev) =>
        quantity <= 0
          ? prev.filter((i) => !(i.slug === slug && i.colorName === colorName))
          : prev.map((i) =>
              i.slug === slug && i.colorName === colorName
                ? { ...i, quantity }
                : i
            )
      );
    },
    []
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
      const product = getProductBySlug(item.slug);
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
  }, [items]);

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
