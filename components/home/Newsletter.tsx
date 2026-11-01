"use client";

import { FormEvent, useState } from "react";
import { Icon } from "@/components/ui/Icon";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const submit = (event: FormEvent) => { event.preventDefault(); if (!/^\S+@\S+\.\S+$/.test(email)) { setMessage("Vui lòng nhập email hợp lệ."); return; } setMessage("Cảm ơn bạn! Bạn đã được ghi nhận."); setEmail(""); };
  return <section className="newsletter-section relative isolate overflow-hidden bg-navy py-16"><div className="newsletter-radiance" aria-hidden="true" /><div className="newsletter-grid" aria-hidden="true" /><div className="relative z-10 container-shell flex flex-col items-center text-center"><p className="section-kicker !text-lime">Nova letter</p><h2 className="section-title !text-white">Đừng bỏ lỡ điều mới mẻ</h2><p className="mt-4 max-w-xl text-sm leading-6 text-white/65">Đăng ký nhận thông tin về sản phẩm mới và ưu đãi dành riêng cho bạn</p><form onSubmit={submit} noValidate className="relative z-10 mt-8 flex w-full max-w-xl flex-col gap-3 sm:flex-row"><label htmlFor="newsletter-email" className="sr-only">Email</label><input id="newsletter-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Địa chỉ email của bạn" className="h-12 min-w-0 flex-1 rounded-full border border-white/20 bg-white px-5 text-navy outline-none transition placeholder:text-muted focus:border-lime" /><button className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-lime text-navy shadow-[0_12px_30px_rgba(163,255,18,.18)] hover:bg-white px-6 text-sm font-semibold text-white hover:bg-cobalt">Đăng ký <Icon name="arrow" className="size-4" /></button></form>{message && <p role="status" className="mt-4 text-sm font-semibold text-cobalt">{message}</p>}</div></section>;
}
