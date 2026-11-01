"use client";

import { useState } from "react";
import type { Product } from "@/types/product";
import { useStore } from "@/components/store-context";
import { Icon } from "@/components/ui/Icon";

export function ProductDetailActions({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(1);
  const [variant, setVariant] = useState(product.variants?.options[0]);
  const { addToCart, favorites, toggleFavorite } = useStore();
  const saved = favorites.includes(product.id);
  return <><div className="mt-7 space-y-6">{product.variants && <fieldset><legend className="mb-3 text-xs font-bold uppercase tracking-wider text-navy">{product.variants.label}</legend><div className="flex flex-wrap gap-2">{product.variants.options.map((option) => <button key={option} type="button" onClick={() => setVariant(option)} aria-pressed={variant === option} className={`min-w-12 rounded-full border px-4 py-2 text-sm font-semibold ${variant === option ? "border-navy bg-navy text-white" : "border-line hover:border-navy"}`}>{option}</button>)}</div></fieldset>}<div><p className="mb-3 text-xs font-bold uppercase tracking-wider text-navy">Số lượng</p><div className="inline-flex h-12 items-center rounded-full border border-line"><button type="button" className="grid size-12 place-items-center" onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Giảm số lượng"><Icon name="minus" className="size-4" /></button><span className="w-10 text-center text-sm font-bold">{quantity}</span><button type="button" className="grid size-12 place-items-center" onClick={() => setQuantity(quantity + 1)} aria-label="Tăng số lượng"><Icon name="plus" className="size-4" /></button></div></div></div><div className="mt-8 flex gap-3"><button type="button" onClick={() => addToCart(product.id, quantity, variant)} className="flex h-13 flex-1 items-center justify-center gap-2 rounded-full bg-navy px-6 text-sm font-bold text-white transition hover:bg-cobalt"><Icon name="bag" className="size-5" />Thêm vào giỏ hàng</button><button type="button" onClick={() => toggleFavorite(product.id)} aria-pressed={saved} aria-label={saved ? "Xóa khỏi yêu thích" : "Lưu yêu thích"} className={`grid size-13 place-items-center rounded-full border ${saved ? "border-navy bg-navy text-white" : "border-line text-navy"}`}><Icon name="heart" className={`size-5 ${saved ? "fill-current" : ""}`} /></button></div></>;
}
