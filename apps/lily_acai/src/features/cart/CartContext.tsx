import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AddCartItemInput, CartItem } from "./types";

const STORAGE_KEY = "cooklily_cart_v1";

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  snapshotSubtotalCents: number;
  addItem: (item: AddCartItemInput) => void;
  removeItem: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  setNote: (id: string, note: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function safeLoad(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is CartItem =>
      item && typeof item === "object"
      && typeof item.id === "string"
      && typeof item.productId === "string"
      && typeof item.configurationHash === "string"
      && Number.isInteger(item.unitPriceCents)
      && Number.isInteger(item.quantity)
      && item.quantity > 0
    ).slice(0, 30);
  } catch {
    return [];
  }
}

function itemIdentity(item: AddCartItemInput) {
  return JSON.stringify({
    productId: item.productId,
    sizeMl: item.sizeMl,
    flavorIds: [...item.flavorIds].sort(),
    addons: item.addons.map((addon) => ({ addonId: addon.addonId, quantity: addon.quantity }))
      .sort((a, b) => a.addonId.localeCompare(b.addonId)),
    configurationHash: item.configurationHash
  });
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(safeLoad);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    snapshotSubtotalCents: items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0),
    addItem(input) {
      setItems((current) => {
        const identity = itemIdentity(input);
        const found = current.find((item) => itemIdentity(item) === identity && !item.note);
        if (found) {
          return current.map((item) => item.id === found.id
            ? { ...item, quantity: Math.min(20, item.quantity + 1) }
            : item);
        }
        return [...current, {
          ...input,
          id: crypto.randomUUID(),
          quantity: 1,
          note: ""
        }].slice(-30);
      });
    },
    removeItem(id) {
      setItems((current) => current.filter((item) => item.id !== id));
    },
    setQuantity(id, quantity) {
      setItems((current) => current.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(1, Math.min(20, quantity)) } : item
      ));
    },
    setNote(id, note) {
      setItems((current) => current.map((item) =>
        item.id === id ? { ...item, note: note.slice(0, 300) } : item
      ));
    },
    clear() {
      setItems([]);
    }
  }), [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart precisa estar dentro de CartProvider.");
  return value;
}
