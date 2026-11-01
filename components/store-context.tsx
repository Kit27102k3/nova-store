"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { CartItem } from "@/types/product";

const CART_KEY = "nova-store-cart";
const FAVORITES_KEY = "nova-store-favorites";
type Toast = { id: number; message: string };
type StoreContextValue = { cart: CartItem[]; favorites: number[]; toast: Toast | null; addToCart: (productId: number, quantity?: number, variant?: string) => void; updateQuantity: (productId: number, quantity: number, variant?: string) => void; removeFromCart: (productId: number, variant?: string) => void; toggleFavorite: (productId: number) => void; clearCart: () => void };
const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      // Hydrate browser-only storage after the server-rendered shell mounts.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCart(JSON.parse(localStorage.getItem(CART_KEY) ?? "[]") as CartItem[]);
      setFavorites(JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]") as number[]);
    } catch { /* Ignore malformed local data. */ }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem(CART_KEY, JSON.stringify(cart)); }, [cart, ready]);
  useEffect(() => { if (ready) localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites)); }, [favorites, ready]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(null), 2600); return () => window.clearTimeout(timer); }, [toast]);

  const notify = (message: string) => setToast({ id: Date.now(), message });
  const addToCart = (productId: number, quantity = 1, variant?: string) => {
    setCart((current) => { const existing = current.find((item) => item.productId === productId && item.variant === variant); return existing ? current.map((item) => item === existing ? { ...item, quantity: item.quantity + quantity } : item) : [...current, { productId, quantity, variant }]; });
    notify("Đã thêm vào giỏ hàng");
  };
  const updateQuantity = (productId: number, quantity: number, variant?: string) => setCart((current) => quantity <= 0 ? current.filter((item) => !(item.productId === productId && item.variant === variant)) : current.map((item) => item.productId === productId && item.variant === variant ? { ...item, quantity } : item));
  const removeFromCart = (productId: number, variant?: string) => { setCart((current) => current.filter((item) => !(item.productId === productId && item.variant === variant))); notify("Đã xóa sản phẩm"); };
  const toggleFavorite = (productId: number) => { const exists = favorites.includes(productId); setFavorites((current) => exists ? current.filter((id) => id !== productId) : [...current, productId]); notify(exists ? "Đã xóa khỏi yêu thích" : "Đã lưu yêu thích"); };
  const clearCart = () => setCart([]);

  return <StoreContext.Provider value={{ cart, favorites, toast, addToCart, updateQuantity, removeFromCart, toggleFavorite, clearCart }}>{children}{toast && <div role="status" className="fixed bottom-5 left-1/2 z-[100] -translate-x-1/2 rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white shadow-soft">{toast.message}</div>}</StoreContext.Provider>;
}

export function useStore() { const context = useContext(StoreContext); if (!context) throw new Error("useStore must be used within StoreProvider"); return context; }
