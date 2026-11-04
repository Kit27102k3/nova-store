"use client";

import Image from "next/image";
import Link from "next/link";
import { useStore } from "@/components/store-context";
import { Icon } from "@/components/ui/Icon";
import { formatPrice } from "@/data/products";
import type { Product } from "@/types/product";

export function ProductCard({ product }: { product: Product }) {
  const { addToCart, authStatus, favorites, toggleFavorite } = useStore();
  const saved = favorites.includes(product.id);
  const variantLabel = product.variants
    ? `Chọn ${product.variants.label.toLocaleLowerCase("vi-VN")}`
    : null;

  return (
    <article className="group min-w-0">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[18px] bg-mist">
        <Link
          href={`/products/${product.slug}`}
          className="relative block h-full"
          aria-label={`Xem ${product.name}`}
        >
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition duration-700 group-hover:scale-[1.035]"
          />
        </Link>
        {product.badge && (
          <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-navy shadow-soft">
            {product.badge}
          </span>
        )}
        <button
          type="button"
          onClick={() => toggleFavorite(product.id)}
          aria-pressed={saved}
          aria-label={`${saved ? "Xóa" : "Thêm"} ${product.name} ${
            saved ? "khỏi" : "vào"
          } yêu thích`}
          className={`absolute right-3 top-3 grid size-10 place-items-center rounded-full shadow-soft transition ${
            saved
              ? "bg-navy text-white"
              : "bg-white text-navy hover:text-cobalt"
          }`}
        >
          <Icon
            name="heart"
            className={`size-4 ${saved ? "fill-current" : ""}`}
          />
        </button>
        {variantLabel ? (
          <Link
            href={`/products/${product.slug}`}
            className="absolute inset-x-3 bottom-3 hidden h-11 translate-y-2 items-center justify-center gap-2 rounded-full bg-navy text-sm font-semibold text-white opacity-0 transition hover:bg-cobalt group-hover:translate-y-0 group-hover:opacity-100 sm:flex"
          >
            {variantLabel} <Icon name="arrow" className="size-4" />
          </Link>
        ) : (
          authStatus === "authenticated" ? (
            <button
              type="button"
              onClick={() => addToCart(product.id)}
              className="absolute inset-x-3 bottom-3 hidden h-11 translate-y-2 items-center justify-center gap-2 rounded-full bg-navy text-sm font-semibold text-white opacity-0 transition hover:bg-cobalt group-hover:translate-y-0 group-hover:opacity-100 sm:flex"
            >
              Thêm vào giỏ <Icon name="plus" className="size-4" />
            </button>
          ) : (
            <Link
              href="/account"
              className="absolute inset-x-3 bottom-3 hidden h-11 translate-y-2 items-center justify-center gap-2 rounded-full bg-navy text-sm font-semibold text-white opacity-0 transition hover:bg-cobalt group-hover:translate-y-0 group-hover:opacity-100 sm:flex"
            >
              Đăng nhập để mua <Icon name="arrow" className="size-4" />
            </Link>
          )
        )}
      </div>
      <div className="pt-4">
        <p className="text-xs text-muted">{product.category}</p>
        <Link
          href={`/products/${product.slug}`}
          className="mt-1 block text-[15px] font-semibold text-navy hover:text-cobalt"
        >
          {product.name}
        </Link>
        <div className="mt-2 flex items-end justify-between gap-2">
          <div>
            <span className="font-semibold text-navy">
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && (
              <span className="ml-2 text-xs text-muted line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted">
            <Icon
              name="star"
              className="size-3 fill-amber-400 text-amber-400"
            />
            <span>{product.rating}</span>
            <span className="hidden lg:inline">({product.reviews})</span>
          </div>
        </div>
        {variantLabel ? (
          <Link
            href={`/products/${product.slug}`}
            className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full border border-line text-sm font-semibold text-navy hover:border-cobalt hover:text-cobalt sm:hidden"
          >
            <Icon name="bag" className="size-4" /> {variantLabel}
          </Link>
        ) : (
          authStatus === "authenticated" ? (
            <button
              type="button"
              onClick={() => addToCart(product.id)}
              className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full border border-line text-sm font-semibold text-navy sm:hidden"
            >
              <Icon name="bag" className="size-4" /> Thêm vào giỏ
            </button>
          ) : (
            <Link
              href="/account"
              className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full border border-line text-sm font-semibold text-navy sm:hidden"
            >
              Đăng nhập để mua
            </Link>
          )
        )}
      </div>
    </article>
  );
}
