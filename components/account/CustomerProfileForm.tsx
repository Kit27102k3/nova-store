"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { saveCustomerProfile } from "@/app/actions/customer";

const fieldClass =
  "mt-2 h-12 w-full rounded-xl border border-line bg-white px-4 text-sm outline-none transition focus:border-cobalt focus:ring-4 focus:ring-cobalt/10";

export function CustomerProfileForm({
  email,
  name,
  phone,
}: {
  email: string;
  name: string;
  phone: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    success: boolean;
    text: string;
  } | null>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await saveCustomerProfile(formData);
      setMessage({ success: result.success, text: result.message });
      if (result.success) router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="mt-7 space-y-4 border-t border-line pt-6">
      <h3 className="font-bold text-navy">Thông tin cá nhân</h3>
      <label className="block text-sm font-semibold text-navy">
        Họ và tên
        <input
          name="name"
          required
          minLength={2}
          maxLength={120}
          defaultValue={name}
          autoComplete="name"
          className={fieldClass}
          disabled={pending}
        />
      </label>
      <label className="block text-sm font-semibold text-navy">
        Email tài khoản
        <input
          type="email"
          value={email}
          readOnly
          className={`${fieldClass} bg-mist text-muted`}
        />
        <span className="mt-1 block text-xs font-normal text-muted">
          Email được xác thực và hiện chưa hỗ trợ đổi trong trang này.
        </span>
      </label>
      <label className="block text-sm font-semibold text-navy">
        Số điện thoại
        <input
          name="phone"
          type="tel"
          maxLength={32}
          defaultValue={phone}
          autoComplete="tel"
          className={fieldClass}
          disabled={pending}
        />
      </label>
      {message && (
        <p
          role={message.success ? "status" : "alert"}
          className={`rounded-xl border p-3 text-sm ${
            message.success
              ? "border-[#18795e]/20 bg-[#eaf7f2] text-[#18795e]"
              : "border-coral/40 bg-coral/10 text-navy"
          }`}
        >
          {message.text}
        </p>
      )}
      <button
        disabled={pending}
        className="h-11 w-full rounded-xl bg-navy text-sm font-bold text-white transition hover:bg-cobalt disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Đang lưu..." : "Lưu thông tin"}
      </button>
    </form>
  );
}
