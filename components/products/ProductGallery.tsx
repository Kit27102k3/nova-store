"use client";

import Image from "next/image";
import { useState } from "react";

export function ProductGallery({
  name,
  images,
  badge,
}: {
  name: string;
  images: string[];
  badge?: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = images[activeIndex];

  if (!activeImage) {
    return (
      <div
        role="img"
        aria-label={`Chưa có hình ảnh cho ${name}`}
        className="grid aspect-square place-items-center rounded-2xl bg-gradient-to-br from-[#eef0ff] to-[#f8f2ed] text-sm font-semibold text-muted"
      >
        Chưa có hình ảnh sản phẩm
      </div>
    );
  }

  return (
    <section aria-label={`Bộ sưu tập hình ảnh ${name}`} className="min-w-0">
      <div
        className={`grid gap-3 ${
          images.length > 1 ? "sm:grid-cols-[76px_minmax(0,1fr)]" : ""
        }`}
      >
        {images.length > 1 && (
          <div
            aria-label="Chọn hình ảnh sản phẩm"
            className="order-2 flex gap-2 overflow-x-auto sm:order-1 sm:max-h-[620px] sm:flex-col sm:overflow-y-auto sm:overflow-x-hidden"
          >
            {images.map((src, index) => (
              <button
                key={`${src}-${index}`}
                type="button"
                aria-label={`Xem hình ${index + 1} của ${name}`}
                aria-pressed={activeIndex === index}
                onClick={() => setActiveIndex(index)}
                className={`relative size-[68px] shrink-0 overflow-hidden rounded-xl border-2 bg-mist transition sm:size-[76px] ${
                  activeIndex === index
                    ? "border-cobalt ring-2 ring-cobalt/15"
                    : "border-transparent opacity-70 hover:border-cobalt/40 hover:opacity-100"
                }`}
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="76px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}

        <div
          className={`group relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-[#eef0ff] to-[#f8f2ed] sm:aspect-[1/1] lg:aspect-[1/0.96] ${
            images.length > 1 ? "order-1 sm:order-2" : ""
          }`}
        >
          <Image
            key={activeImage}
            src={activeImage}
            alt={`${name} — hình ${activeIndex + 1}`}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 58vw"
            className="object-cover transition duration-500 group-hover:scale-[1.02]"
          />
          {badge && (
            <span className="absolute left-4 top-4 rounded-full bg-[#dfff00] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-navy shadow-soft">
              {badge}
            </span>
          )}
          {images.length > 1 && (
            <span className="absolute bottom-4 right-4 rounded-full bg-navy/75 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur">
              {activeIndex + 1} / {images.length}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
