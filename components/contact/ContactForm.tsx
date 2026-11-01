"use client";

import { useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/Icon";

const fieldClass =
  "mt-2 h-12 w-full rounded-xl border border-line bg-white px-4 outline-none transition focus:border-cobalt";

export function ContactForm({ supportEmail }: { supportEmail: string }) {
  const [message, setMessage] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const subject = `[Nova Store] ${String(formData.get("subject") ?? "").trim()}`;
    const body = [
      `Họ tên: ${String(formData.get("name") ?? "").trim()}`,
      `Email phản hồi: ${String(formData.get("email") ?? "").trim()}`,
      "",
      String(formData.get("message") ?? "").trim(),
    ].join("\n");
    window.location.href = `mailto:${encodeURIComponent(supportEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setMessage("Đã mở ứng dụng email. Hãy gửi thư để Nova nhận được yêu cầu hỗ trợ.");
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-[28px] border border-line bg-gradient-to-br from-white via-white to-mist/80 p-6 shadow-soft sm:p-8"
    >
      <div className="mb-7">
        <p className="section-kicker">Gửi lời nhắn</p>
        <h2 className="font-display text-3xl text-navy">
          Bạn cần chúng tôi giúp gì?
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Biểu mẫu sẽ mở ứng dụng email để bạn gửi yêu cầu trực tiếp đến Nova.
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-semibold text-navy">
          Họ và tên
          <input
            required
            minLength={2}
            maxLength={120}
            name="name"
            autoComplete="name"
            className={fieldClass}
          />
        </label>
        <label className="text-sm font-semibold text-navy">
          Email
          <input
            required
            type="email"
            maxLength={254}
            name="email"
            autoComplete="email"
            className={fieldClass}
          />
        </label>
        <label className="text-sm font-semibold text-navy sm:col-span-2">
          Chủ đề
          <select name="subject" className={fieldClass}>
            <option>Sản phẩm</option>
            <option>Đơn hàng</option>
            <option>Giao hàng & đổi trả</option>
            <option>Khác</option>
          </select>
        </label>
        <label className="text-sm font-semibold text-navy sm:col-span-2">
          Nội dung
          <textarea
            required
            minLength={10}
            maxLength={5000}
            name="message"
            rows={6}
            className="mt-2 w-full resize-y rounded-xl border border-line bg-white px-4 py-3 outline-none transition focus:border-cobalt"
          />
        </label>
      </div>
      <button className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-navy text-sm font-bold text-white transition hover:bg-cobalt sm:w-auto sm:px-8">
        Mở email để gửi <Icon name="arrow" className="size-4" />
      </button>
      {message && (
        <p role="status" className="mt-4 text-sm font-semibold text-[#18795e]">
          {message}
        </p>
      )}
    </form>
  );
}
