import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { ProductCard } from "@/components/products/ProductCard";
import { ProductDetailActions } from "@/components/products/ProductDetailActions";
import { ProductGallery } from "@/components/products/ProductGallery";
import { ProductReviews } from "@/components/products/ProductReviews";
import { Icon } from "@/components/ui/Icon";
import { formatPrice } from "@/data/products";
import { getStoreCatalog } from "@/lib/supabase/catalog";
import { getProductReviews } from "@/lib/supabase/customer";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { products } = await getStoreCatalog();
  const product = products.find((entry) => entry.slug === slug);

  return product
    ? { title: product.name, description: product.description }
    : {};
}

export default function ProductPage({ params }: ProductPageProps) {
  return (
    <Suspense fallback={<ProductPageSkeleton />}>
      <ProductContent params={params} />
    </Suspense>
  );
}

async function ProductContent({ params }: ProductPageProps) {
  const { slug } = await params;
  const { products } = await getStoreCatalog();
  const product = products.find((entry) => entry.slug === slug);

  if (!product) notFound();

  const related = products
    .filter((item) => item.category === product.category && item.id !== product.id)
    .slice(0, 4);
  const reviewResult = await getProductReviews(product.id);

  return (
    <div className="pb-16 pt-5 sm:pt-7">
      <div className="container-shell">
        <Breadcrumb
          items={[
            { label: "Sản phẩm", href: "/products" },
            { label: product.name },
          ]}
        />

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(380px,.92fr)] lg:gap-7">
          <ProductGallery
            name={product.name}
            images={product.images}
            badge={product.badge}
          />

          <section className="relative h-fit overflow-hidden rounded-2xl border border-[#e5e7f0] bg-white shadow-[0_16px_45px_-35px_rgba(17,24,39,0.5)] lg:sticky lg:top-24">
            <div className="pointer-events-none absolute -right-14 -top-20 size-48 rounded-full bg-[#dfe3ff]/70 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-12 size-40 rounded-full bg-[#ffe4dc]/70 blur-3xl" />

            <div className="relative p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#f0f1ff] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-cobalt">
                  {product.category}
                  <span className="size-1 rounded-full bg-coral" />
                  {product.isNew ? "Mới về" : "Nova selection"}
                </span>
                {product.badge && (
                  <span className="rounded-full bg-[#fff0ec] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-coral">
                    {product.badge}
                  </span>
                )}
              </div>

              <h1 className="mt-4 font-sans text-2xl font-extrabold leading-tight tracking-tight text-navy sm:text-3xl">
                {product.name}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1.5 font-extrabold text-amber-900">
                  <Icon
                    name="star"
                    className="size-3.5 fill-amber-400 text-amber-400"
                  />
                  {product.rating}
                </span>
                <span className="text-muted">{product.reviews} đánh giá</span>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-gradient-to-r from-[#f0f2ff] to-[#fff3ef] px-4 py-3">
                <strong className="text-2xl font-extrabold tracking-tight text-cobalt">
                  {formatPrice(product.price)}
                </strong>
                {product.originalPrice && (
                  <>
                    <span className="text-sm text-muted line-through">
                      {formatPrice(product.originalPrice)}
                    </span>
                    <span className="rounded-full bg-coral px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide text-white">
                      Ưu đãi
                    </span>
                  </>
                )}
              </div>

              <ProductDetailActions product={product} />

              <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#e5e7fb] bg-[#f5f6ff] p-3.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-cobalt shadow-sm">
                  <Icon name="truck" className="size-4.5" />
                </span>
                <div>
                  <p className="text-xs font-extrabold text-navy">
                    Giao hàng & đổi trả
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-muted">
                    Miễn phí vận chuyển từ 499.000đ · Đổi trả trong 7 ngày với
                    điều kiện nguyên trạng.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section
          aria-labelledby="product-information-title"
          className="mt-8 overflow-hidden rounded-2xl border border-[#e5e7f0] bg-white shadow-[0_14px_38px_-32px_rgba(17,24,39,0.5)]"
        >
          <div className="border-b border-[#e9eaf2] bg-gradient-to-r from-[#f0f2ff] to-[#fff3ef] px-5 py-4 sm:px-6">
            <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-cobalt">
              Thông tin chi tiết
            </p>
            <h2
              id="product-information-title"
              className="mt-1 font-sans text-lg font-extrabold text-navy"
            >
              Thông tin sản phẩm
            </h2>
          </div>
          <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.2fr_.8fr]">
            <div>
              <h3 className="text-sm font-extrabold text-navy">
                Mô tả sản phẩm
              </h3>
              <p className="mt-2 whitespace-pre-line text-sm leading-7 text-muted">
                {product.description || "Sản phẩm chưa có mô tả chi tiết."}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-navy">
                Điểm nổi bật
              </h3>
              {product.details.length > 0 ? (
                <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  {product.details.map((detail) => (
                    <li
                      key={detail}
                      className="flex items-start gap-2.5 rounded-xl border border-[#eceef6] bg-[#fbfbff] px-3 py-2.5 text-sm leading-5 text-navy"
                    >
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#e8f4ad] text-navy">
                        <Icon name="check" className="size-3" />
                      </span>
                      {detail}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted">
                  Chưa có thông tin bổ sung cho sản phẩm này.
                </p>
              )}
              {product.variants && (
                <p className="mt-4 rounded-xl bg-[#f5f6ff] px-3 py-2.5 text-sm text-muted">
                  {product.variants.label}:{" "}
                  <span className="font-semibold text-navy">
                    {product.variants.options.join(", ")}
                  </span>
                </p>
              )}
            </div>
          </div>
        </section>

        <ProductReviews
          productId={product.id}
          reviews={reviewResult.data}
          error={reviewResult.error}
        />

        {related.length > 0 && (
          <section className="mt-14 sm:mt-16">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="section-kicker">Gợi ý dành cho bạn</p>
                <h2 className="font-sans text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">
                  Sản phẩm liên quan
                </h2>
              </div>
              <span className="rounded-full bg-[#f0f1ff] px-3 py-1.5 text-xs font-bold text-cobalt">
                {product.category}
              </span>
            </div>
            <div className="product-grid mt-5 grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-5">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function ProductPageSkeleton() {
  return (
    <div className="container-shell pb-16 pt-7" aria-label="Đang tải sản phẩm">
      <div className="h-4 w-56 animate-pulse rounded bg-mist" />
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(380px,.92fr)] lg:gap-7">
        <div className="aspect-[4/3] animate-pulse rounded-2xl bg-gradient-to-br from-mist to-[#eef0ff]" />
        <div className="space-y-4 rounded-2xl border border-line p-6">
          <div className="h-6 w-32 animate-pulse rounded-full bg-mist" />
          <div className="h-9 w-3/4 animate-pulse rounded bg-mist" />
          <div className="h-12 animate-pulse rounded-xl bg-[#f0f2ff]" />
          <div className="h-24 animate-pulse rounded-xl bg-mist" />
          <div className="h-12 animate-pulse rounded-xl bg-mist" />
        </div>
      </div>
    </div>
  );
}
