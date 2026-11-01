"use client";

import { useActionState } from "react";
import { subscribeToNewsletter } from "@/app/actions/engagement";
import { Icon } from "@/components/ui/Icon";

export function Newsletter() {
  const [state, action, pending] = useActionState(subscribeToNewsletter, null);
  return (
    <section className="newsletter-section relative isolate overflow-hidden bg-navy py-16">
      <div className="newsletter-radiance" aria-hidden="true" />
      <div className="newsletter-grid" aria-hidden="true" />
      <div className="relative z-10 container-shell flex flex-col items-center text-center">
        <p className="section-kicker !text-lime">Nova letter</p>
        <h2 className="section-title !text-white">
          Đừng bỏ lỡ điều mới mẻ
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-6 text-white/65">
          Đăng ký nhận thông tin về sản phẩm mới và ưu đãi dành riêng cho bạn
        </p>
        <form
          action={action}
          className="relative z-10 mt-8 flex w-full max-w-xl flex-col gap-3 sm:flex-row"
        >
          <label htmlFor="newsletter-email" className="sr-only">
            Email
          </label>
          <input
            id="newsletter-email"
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            placeholder="Địa chỉ email của bạn"
            className="h-12 min-w-0 flex-1 rounded-full border border-white/20 bg-white px-5 text-navy outline-none transition placeholder:text-muted focus:border-lime"
          />
          <button
            disabled={pending}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-lime px-6 text-sm font-semibold text-navy shadow-[0_12px_30px_rgba(163,255,18,.18)] transition hover:bg-white disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? "Đang đăng ký..." : "Đăng ký"}
            <Icon name="arrow" className="size-4" />
          </button>
        </form>
        {state && (
          <p
            role={state.status === "error" ? "alert" : "status"}
            className={`mt-4 text-sm font-semibold ${
              state.status === "error" ? "text-[#ffb4a9]" : "text-lime"
            }`}
          >
            {state.message}
          </p>
        )}
      </div>
    </section>
  );
}
