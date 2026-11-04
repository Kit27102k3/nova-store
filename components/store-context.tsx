"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  startTransition,
  type ReactNode,
} from "react";
import type { CartItem, Product } from "@/types/product";
import type { StoreSettings } from "@/lib/supabase/catalog";
import { getSupabaseConfig } from "@/lib/supabase/config";

const CART_KEY = "nova-store-cart";
const FAVORITES_KEY = "nova-store-favorites";
type Toast = { id: number; message: string };
type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";
type StoreContextValue = {
  cart: CartItem[];
  favorites: number[];
  toast: Toast | null;
  products: Product[];
  settings: StoreSettings;
  favoritesReady: boolean;
  authStatus: AuthStatus;
  addToCart: (productId: number, quantity?: number, variant?: string) => void;
  updateQuantity: (productId: number, quantity: number, variant?: string) => void;
  removeFromCart: (productId: number, variant?: string) => void;
  toggleFavorite: (productId: number) => void;
  syncWishlist: () => Promise<void>;
  clearCart: () => void;
};
const StoreContext = createContext<StoreContextValue | null>(null);

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.productId === "number" &&
    Number.isSafeInteger(item.productId) &&
    typeof item.quantity === "number" &&
    Number.isSafeInteger(item.quantity) &&
    item.quantity > 0 &&
    item.quantity <= 99 &&
    (item.variant === undefined || typeof item.variant === "string")
  );
}

function readStorage(key: string): unknown {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error(`Không thể đọc dữ liệu ${key} từ trình duyệt.`, error);
    return null;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Không thể lưu dữ liệu ${key} vào trình duyệt.`, error);
  }
}

function removeStorage(key: string) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Không thể xóa dữ liệu ${key} khỏi trình duyệt.`, error);
  }
}

export function StoreProvider({
  children,
  products,
  settings,
}: {
  children: ReactNode;
  products: Product[];
  settings: StoreSettings;
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const [ready, setReady] = useState(false);
  const [wishlistSyncComplete, setWishlistSyncComplete] = useState(false);
  const [remoteWishlistEnabled, setRemoteWishlistEnabled] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus>(() =>
    getSupabaseConfig() ? "loading" : "unauthenticated",
  );
  const favoritesRef = useRef(favorites);
  const wishlistRequestRef = useRef(false);

  useEffect(() => {
    const availableIds = new Set(products.map((product) => product.id));
    const storedCart = readStorage(CART_KEY);
    const hydratedCart = Array.isArray(storedCart)
      ? storedCart
          .filter(isCartItem)
          .filter((item) => availableIds.has(item.productId))
      : [];
    if (!Array.isArray(storedCart) && storedCart !== null) {
      console.error("Giỏ hàng trong trình duyệt không hợp lệ.");
    }

    const storedFavorites = getSupabaseConfig()
      ? null
      : readStorage(FAVORITES_KEY);
    const hydratedFavorites = Array.isArray(storedFavorites)
      ? [...new Set(storedFavorites)].filter(
          (id): id is number =>
            typeof id === "number" &&
            Number.isSafeInteger(id) &&
            availableIds.has(id),
        )
      : [];
    if (!Array.isArray(storedFavorites) && storedFavorites !== null) {
      console.error("Danh sách yêu thích trong trình duyệt không hợp lệ.");
    }

    startTransition(() => {
      setCart(hydratedCart);
      setFavorites(hydratedFavorites);
      setReady(true);
    });
    if (getSupabaseConfig()) removeStorage(FAVORITES_KEY);
  }, [products]);

  useEffect(() => {
    favoritesRef.current = favorites;
  }, [favorites]);

  const refreshAuthStatus = useCallback(async () => {
    if (!getSupabaseConfig()) {
      setAuthStatus("unauthenticated");
      return;
    }

    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Tải trạng thái tài khoản thất bại (${response.status}).`);
      }
      const result: { user: unknown | null } = await response.json();
      setAuthStatus(result.user ? "authenticated" : "unauthenticated");
    } catch (error) {
      console.error("Không thể xác minh tài khoản trước khi mua hàng.", error);
      setAuthStatus("error");
    }
  }, []);

  const syncWishlist = useCallback(async () => {
    if (!ready) return;
    if (!getSupabaseConfig()) {
      setAuthStatus("unauthenticated");
      setWishlistSyncComplete(true);
      return;
    }
    if (wishlistRequestRef.current) return;
    wishlistRequestRef.current = true;
    setAuthStatus("loading");
    setWishlistSyncComplete(false);
    try {
      const response = await fetch("/api/account/wishlist", {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`Tải danh sách yêu thích thất bại (${response.status}).`);
      }
      const result: { authenticated: boolean; productIds: number[] } =
        await response.json();
      if (!result.authenticated) {
        setAuthStatus("unauthenticated");
        favoritesRef.current = [];
        setFavorites([]);
        setRemoteWishlistEnabled(false);
        setWishlistSyncComplete(true);
        return;
      }
      const availableIds = new Set(products.map((product) => product.id));
      const productIds = [
        ...new Set(result.productIds.filter((id) => availableIds.has(id))),
      ];
      setAuthStatus("authenticated");
      favoritesRef.current = productIds;
      setFavorites(productIds);
      setRemoteWishlistEnabled(true);
      setWishlistSyncComplete(true);
    } catch (error) {
      console.error("Không thể đồng bộ danh sách yêu thích.", error);
      setWishlistSyncComplete(true);
      await refreshAuthStatus();
    } finally {
      wishlistRequestRef.current = false;
    }
  }, [products, ready, refreshAuthStatus]);

  useEffect(() => {
    if (ready) startTransition(() => void syncWishlist());
  }, [ready, syncWishlist]);

  useEffect(() => {
    if (!ready) return;
    writeStorage(CART_KEY, cart);
    if (getSupabaseConfig()) {
      removeStorage(FAVORITES_KEY);
    } else {
      writeStorage(FAVORITES_KEY, favorites);
    }
    if (!wishlistSyncComplete || !remoteWishlistEnabled) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/account/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productIds: favorites }),
          signal: controller.signal,
        });
        if (response.status === 401) {
          setRemoteWishlistEnabled(false);
          return;
        }
        if (!response.ok) {
          throw new Error(`Lưu danh sách yêu thích thất bại (${response.status}).`);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Không thể lưu danh sách yêu thích vào tài khoản.", error);
      }
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [cart, favorites, ready, remoteWishlistEnabled, wishlistSyncComplete]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const notify = useCallback((message: string) => {
    setToast({ id: Date.now(), message });
  }, []);

  const addToCart = useCallback(
    (productId: number, quantity = 1, variant?: string) => {
      if (authStatus !== "authenticated") {
        notify(
          authStatus === "loading"
            ? "Đang kiểm tra đăng nhập. Vui lòng thử lại sau giây lát."
            : authStatus === "error"
              ? "Không thể xác minh đăng nhập. Vui lòng tải lại trang."
              : "Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.",
        );
        return;
      }
      const product = products.find((entry) => entry.id === productId);
      if (!product || !Number.isSafeInteger(quantity) || quantity < 1) {
        notify("Sản phẩm hoặc số lượng không hợp lệ.");
        return;
      }
      if (
        (product.variants &&
          !product.variants.options.includes(variant ?? "")) ||
        (!product.variants && variant)
      ) {
        notify(
          product.variants
            ? `Vui lòng chọn ${product.variants.label.toLocaleLowerCase("vi-VN")} trước khi thêm vào giỏ.`
            : "Biến thể sản phẩm không hợp lệ.",
        );
        return;
      }
      setCart((current) => {
        const existing = current.find(
          (item) => item.productId === productId && item.variant === variant,
        );
        if (existing) {
          return current.map((item) =>
            item === existing
              ? { ...item, quantity: Math.min(item.quantity + quantity, 99) }
              : item,
          );
        }
        return [...current, { productId, quantity: Math.min(quantity, 99), variant }];
      });
      notify("Đã thêm vào giỏ hàng");
    },
    [authStatus, notify, products],
  );

  const updateQuantity = useCallback(
    (productId: number, quantity: number, variant?: string) => {
      setCart((current) =>
        quantity <= 0
          ? current.filter(
              (item) =>
                !(item.productId === productId && item.variant === variant),
            )
          : current.map((item) =>
              item.productId === productId && item.variant === variant
                ? { ...item, quantity: Math.min(quantity, 99) }
                : item,
            ),
      );
    },
    [],
  );

  const removeFromCart = useCallback(
    (productId: number, variant?: string) => {
      setCart((current) =>
        current.filter(
          (item) =>
            !(item.productId === productId && item.variant === variant),
        ),
      );
      notify("Đã xóa sản phẩm");
    },
    [notify],
  );

  const toggleFavorite = useCallback(
    (productId: number) => {
      if (!products.some((product) => product.id === productId)) {
        notify("Sản phẩm hiện không khả dụng.");
        return;
      }
      const exists = favoritesRef.current.includes(productId);
      const next = exists
        ? favoritesRef.current.filter((id) => id !== productId)
        : [...favoritesRef.current, productId];
      favoritesRef.current = next;
      setFavorites(next);
      notify(exists ? "Đã xóa khỏi yêu thích" : "Đã lưu yêu thích");
    },
    [notify, products],
  );

  const clearCart = useCallback(() => setCart([]), []);

  return (
    <StoreContext.Provider
      value={{
        cart,
        favorites,
        toast,
        products,
        settings,
        favoritesReady: ready && (!getSupabaseConfig() || wishlistSyncComplete),
        authStatus,
        addToCart,
        updateQuantity,
        removeFromCart,
        toggleFavorite,
        syncWishlist,
        clearCart,
      }}
    >
      {children}
      {toast && (
        <div
          role="status"
          className="fixed bottom-5 left-1/2 z-[100] -translate-x-1/2 rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white shadow-soft"
        >
          {toast.message}
        </div>
      )}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
}
