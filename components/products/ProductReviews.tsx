"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { submitProductReview } from "@/app/actions/customer";
import { useStore } from "@/components/store-context";
import type { ProductReview } from "@/lib/supabase/customer";
import { Icon } from "@/components/ui/Icon";

export function ProductReviews({
  productId,
  reviews,
  error,
}: {
  productId: number;
  reviews: ProductReview[];
  error: string | null;
}) {
  const { authStatus } = useStore();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(5);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(event.currentTarget);
    formData.set("productId", String(productId));
    formData.set("rating", String(rating));
    startTransition(async () => {
      const result = await submitProductReview(formData);
      setMessage(result.message);
      if (result.success) {
        form.reset();
        router.refresh();
      }
    });
  };

  return (
    <section className="mt-10 rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-cobalt">
            Chia sẻ trải nghiệm
          </p>
          <h2 className="mt-1 text-xl font-extrabold text-navy">
            Đánh giá từ khách hàng
          </h2>
        </div>
        <span className="rounded-full bg-mist px-3 py-1.5 text-xs font-bold text-muted">
          {reviews.length} đánh giá đã xác thực
        </span>
      </div>

      {error && (
        <p role="status" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-950">
          {error}
        </p>
      )}
      {!error && reviews.length === 0 && (
        <p className="mt-5 rounded-xl bg-mist p-4 text-sm text-muted">
          Chưa có đánh giá xác thực cho sản phẩm này.
        </p>
      )}
      {reviews.length > 0 && (
        <ul className="mt-5 divide-y divide-line">
          {reviews.map((review) => (
            <li key={review.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold text-navy">{review.title}</h3>
                <time className="text-xs text-muted" dateTime={review.created_at}>
                  {new Date(review.created_at).toLocaleDateString("vi-VN")}
                </time>
              </div>
              <p className="mt-1 flex items-center gap-1 text-amber-500" aria-label={`${review.rating} trên 5 sao`}>
                {Array.from({ length: review.rating }, (_, index) => (
                  <Icon key={index} name="star" className="size-3.5 fill-current" />
                ))}
                <span className="ml-1 text-xs font-bold text-muted">Đã mua hàng</span>
              </p>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted">
                {review.body}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 border-t border-line pt-5">
        {authStatus === "authenticated" ? (
          <>
            <h3 className="font-bold text-navy">Viết đánh giá</h3>
            <p className="mt-1 text-xs leading-5 text-muted">
              Chỉ tài khoản có đơn hàng hoàn thành chứa sản phẩm này mới được gửi đánh giá.
            </p>
            <form onSubmit={submit} className="mt-4 grid gap-3">
              <label className="text-sm font-semibold text-navy">
                Mã đơn hàng
                <input
                  required
                  name="orderNumber"
                  pattern="NV-[0-9]{4}-[0-9]{6,}"
                  maxLength={32}
                  placeholder="NV-2026-000001"
                  className="mt-1 h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-cobalt"
                />
              </label>
              <fieldset>
                <legend className="text-sm font-semibold text-navy">Số sao</legend>
                <div className="mt-2 flex gap-1">
                  {Array.from({ length: 5 }, (_, index) => {
                    const value = index + 1;
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-label={`${value} sao`}
                        aria-pressed={rating === value}
                        onClick={() => setRating(value)}
                        className={`rounded p-1 ${rating >= value ? "text-amber-500" : "text-line"}`}
                      >
                        <Icon name="star" className={`size-5 ${rating >= value ? "fill-current" : ""}`} />
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <label className="text-sm font-semibold text-navy">
                Tiêu đề
                <input
                  required
                  name="title"
                  minLength={2}
                  maxLength={120}
                  className="mt-1 h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-cobalt"
                />
              </label>
              <label className="text-sm font-semibold text-navy">
                Nội dung
                <textarea
                  required
                  name="body"
                  minLength={10}
                  maxLength={2000}
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-line p-3 outline-none focus:border-cobalt"
                />
              </label>
              {message && (
                <p role={message.startsWith("Cảm ơn") ? "status" : "alert"} className="text-sm text-cobalt">
                  {message}
                </p>
              )}
              <button
                disabled={pending}
                className="h-11 w-fit rounded-full bg-navy px-6 text-sm font-bold text-white disabled:opacity-50"
              >
                {pending ? "Đang gửi..." : "Gửi đánh giá"}
              </button>
            </form>
          </>
        ) : (
          <p className="text-sm text-muted">
            <Link href="/account" className="font-bold text-cobalt hover:underline">
              Đăng nhập
            </Link>{" "}
            và hoàn thành đơn hàng có sản phẩm này để gửi đánh giá xác thực.
          </p>
        )}
      </div>
    </section>
  );
}
