"use client";

import { useState } from "react";
import { useStore } from "@/components/store-context";
import { Icon } from "@/components/ui/Icon";
import type { Product } from "@/types/product";

export function ProductDetailActions({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(1);
  const [variant, setVariant] = useState(product.variants?.options[0]);
  const { addToCart, favorites, products, toggleFavorite } = useStore();
  const saved = favorites.includes(product.id);
  const currentProduct = products.find((item) => item.id === product.id);
  const variantStock = product.variants?.inventory;
  const available = product.variants && variant
    ? currentProduct?.variants?.inventory?.[variant]
    : currentProduct?.inventory;
  const outOfStock = available === 0;

  return (
    <div className="mt-5 border-t border-line pt-4">
      {product.variants && (
        <fieldset>
          <legend className="mb-2.5 text-xs font-extrabold text-navy">
            {product.variants.label}
          </legend>
          <div className="flex flex-wrap gap-2">
            {product.variants.options.map((option) => {
              const selected = variant === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setVariant(option)}
                  aria-pressed={selected}
                  disabled={variantStock?.[option] === 0}
                  className={`min-h-9 min-w-10 rounded-lg border px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    selected
                      ? "border-cobalt bg-cobalt text-white shadow-sm shadow-cobalt/20"
                      : "border-line bg-white text-navy hover:border-cobalt hover:bg-[#f5f6ff]"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mb-2 text-xs font-extrabold text-navy">Số lượng</p>
          <div className="inline-flex h-9 items-center rounded-lg border border-line bg-white">
            <button
              type="button"
              disabled={quantity <= 1}
              className="grid size-9 place-items-center rounded-l-lg text-muted transition hover:bg-[#f0f1ff] hover:text-cobalt"
              onClick={() => setQuantity((current) => Math.max(1, current - 1))}
              aria-label="Giảm số lượng"
            >
              <Icon name="minus" className="size-3.5" />
            </button>
            <span className="w-8 text-center text-xs font-extrabold text-navy">
              {quantity}
            </span>
            <button
              type="button"
              disabled={available !== undefined && quantity >= available}
              className="grid size-9 place-items-center rounded-r-lg text-muted transition hover:bg-[#f0f1ff] hover:text-cobalt"
              onClick={() =>
                setQuantity((current) =>
                  available === undefined ? current + 1 : Math.min(available, current + 1),
                )
              }
              aria-label="Tăng số lượng"
            >
              <Icon name="plus" className="size-3.5" />
            </button>
          </div>
        </div>
        <p className="text-right text-[11px] font-semibold text-emerald-700">
          <span className="mr-1.5 inline-block size-1.5 rounded-full bg-emerald-500" />
          Giao hàng toàn quốc
        </p>
      </div>
      {available !== undefined && (
        <p
          role="status"
          className={`mt-3 text-xs font-semibold ${outOfStock ? "text-coral" : "text-emerald-700"}`}
        >
          {outOfStock
            ? "Lựa chọn này hiện đã hết hàng."
            : `Còn ${available} sản phẩm${product.variants ? ` · ${variant}` : ""}.`}
        </p>
      )}

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_44px] gap-2">
        <button
          type="button"
          disabled={outOfStock}
          onClick={() => addToCart(product.id, quantity, variant)}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(100deg,#111827,#315cff)] px-4 text-sm font-extrabold text-white shadow-[0_8px_20px_-12px_rgba(49,92,255,0.8)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon name="bag" className="size-4" />
          {outOfStock ? "Hết hàng" : "Thêm vào giỏ hàng"}
        </button>
        <button
          type="button"
          onClick={() => toggleFavorite(product.id)}
          aria-pressed={saved}
          aria-label={saved ? "Xóa khỏi yêu thích" : "Lưu yêu thích"}
          className={`grid size-11 place-items-center rounded-xl border transition ${
            saved
              ? "border-coral bg-coral text-white"
              : "border-[#ffd8d2] bg-[#fff4f1] text-coral hover:bg-coral hover:text-white"
          }`}
        >
          <Icon name="heart" className={`size-4.5 ${saved ? "fill-current" : ""}`} />
        </button>
      </div>
    </div>
  );
}
