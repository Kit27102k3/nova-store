"use client";

import { useActionState } from "react";
import { adminLogin } from "@/app/actions/admin";

type AdminLoginFormProps = {
  adminEmail: string;
  configured: boolean;
  unauthorized?: boolean;
};

export function AdminLoginForm({
  adminEmail,
  configured,
  unauthorized = false,
}: AdminLoginFormProps) {
  const [state, action, pending] = useActionState(adminLogin, null);

  return (
    <section className="mx-auto max-w-md rounded-[28px] border border-line bg-white p-6 shadow-soft sm:p-9">
      <div className="grid size-12 place-items-center rounded-2xl bg-navy text-lg font-extrabold tracking-wide text-lime">
        N
      </div>
      <p className="mt-6 text-xs font-extrabold uppercase tracking-[.18em] text-cobalt">
        Nova Store · Admin
      </p>
      <h1 className="mt-2 font-display text-3xl text-navy">
        Đăng nhập quản trị
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Sử dụng tài khoản quản trị đã tạo trong Supabase để tiếp tục.
      </p>

      {!configured && (
        <p
          role="alert"
          className="mt-5 rounded-xl border border-coral/40 bg-coral/10 p-4 text-sm leading-6 text-navy"
        >
          {!adminEmail
            ? "Chưa thiết lập ADMIN_EMAIL trên máy chủ."
            : "Chưa cấu hình kết nối Supabase."}{" "}
          Thêm cấu hình vào <code>.env.local</code> rồi khởi động lại ứng dụng.
        </p>
      )}
      {unauthorized && (
        <p
          role="alert"
          className="mt-5 rounded-xl border border-coral/40 bg-coral/10 p-4 text-sm leading-6 text-navy"
        >
          Tài khoản hiện tại không có quyền quản trị. Hãy đăng nhập bằng tài
          khoản admin.
        </p>
      )}
      {state && (
        <p
          role="alert"
          className="mt-5 rounded-xl border border-coral/40 bg-coral/10 p-4 text-sm leading-6 text-navy"
        >
          {state.message}
        </p>
      )}

      <form action={action} className="mt-7 space-y-4">
        <label className="block text-sm font-bold text-navy" htmlFor="admin-email">
          Email quản trị
          <input
            id="admin-email"
            name="email"
            type="email"
            autoComplete="username"
            required
            defaultValue={adminEmail}
            className="mt-2 h-12 w-full rounded-xl border border-line px-4 font-normal outline-none transition focus:border-cobalt focus:ring-4 focus:ring-cobalt/10"
            placeholder="admin@example.com"
          />
        </label>
        <label
          className="block text-sm font-bold text-navy"
          htmlFor="admin-password"
        >
          Mật khẩu
          <input
            id="admin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="mt-2 h-12 w-full rounded-xl border border-line px-4 font-normal outline-none transition focus:border-cobalt focus:ring-4 focus:ring-cobalt/10"
            placeholder="Nhập mật khẩu Supabase"
          />
        </label>
        <button
          type="submit"
          disabled={!configured || pending}
          className="h-12 w-full rounded-xl bg-navy text-sm font-extrabold text-white transition hover:bg-cobalt disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Đang xác thực..." : "Đăng nhập"}
        </button>
      </form>
      <p className="mt-5 text-xs leading-5 text-muted">
        Mật khẩu được Supabase Auth quản lý, không lưu trong mã nguồn.
      </p>
    </section>
  );
}
