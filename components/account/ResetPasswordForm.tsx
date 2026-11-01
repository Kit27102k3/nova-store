"use client";

import { useActionState } from "react";
import { updatePassword } from "@/app/actions/auth";

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, null);

  return (
    <form action={action} className="mt-6 space-y-4">
      <label
        htmlFor="new-password"
        className="block text-sm font-semibold text-navy"
      >
        Mật khẩu mới
        <input
          id="new-password"
          required
          minLength={8}
          name="password"
          type="password"
          autoComplete="new-password"
          className="mt-2 h-12 w-full rounded-xl border border-line px-4 outline-none transition focus:border-cobalt focus:ring-4 focus:ring-cobalt/10"
        />
      </label>
      <label
        htmlFor="confirm-new-password"
        className="block text-sm font-semibold text-navy"
      >
        Xác nhận mật khẩu mới
        <input
          id="confirm-new-password"
          required
          minLength={8}
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          className="mt-2 h-12 w-full rounded-xl border border-line px-4 outline-none transition focus:border-cobalt focus:ring-4 focus:ring-cobalt/10"
        />
      </label>
      <button
        disabled={pending}
        className="h-12 w-full rounded-xl bg-cobalt text-sm font-bold text-white transition hover:bg-navy disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
      </button>
      {state && (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className="rounded-xl border border-coral/40 bg-coral/10 p-4 text-sm leading-6 text-navy"
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
