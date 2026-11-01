"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  login,
  logout,
  register,
  requestPasswordReset,
  type AuthFormState,
} from "@/app/actions/auth";

type AccountAuthProps = {
  configured: boolean;
  email?: string;
  name?: string;
  notice?: string;
};

type Mode = "register" | "login" | "forgot";

function FormMessage({ state }: { state: AuthFormState }) {
  if (!state) return null;

  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={`mt-4 rounded-xl border p-4 text-sm leading-6 ${
        state.status === "error"
          ? "border-coral/40 bg-coral/10 text-navy"
          : "border-lime bg-lime/20 text-navy"
      }`}
    >
      {state.message}
    </p>
  );
}

export function AccountAuth({
  configured,
  email,
  name,
  notice,
}: AccountAuthProps) {
  const [mode, setMode] = useState<Mode>("register");
  const [registerState, registerAction, registering] = useActionState(
    register,
    null,
  );
  const [loginState, loginAction, loggingIn] = useActionState(login, null);
  const [resetState, resetAction, requestingReset] = useActionState(
    requestPasswordReset,
    null,
  );

  if (email) {
    return (
      <div>
        <p className="text-sm font-semibold text-muted">Bạn đã đăng nhập với</p>
        <h2 className="mt-2 break-all font-display text-2xl text-navy">
          {name || email}
        </h2>
        {name && <p className="mt-1 break-all text-sm text-muted">{email}</p>}
        {notice && (
          <FormMessage
            state={{ status: "success", message: notice }}
          />
        )}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            href="/account/orders"
            className="flex h-11 items-center justify-center rounded-xl border border-line text-sm font-bold text-navy transition hover:border-cobalt hover:bg-mist"
          >
            Đơn hàng của tôi
          </Link>
          <Link
            href="/account/addresses"
            className="flex h-11 items-center justify-center rounded-xl border border-line text-sm font-bold text-navy transition hover:border-cobalt hover:bg-mist"
          >
            Địa chỉ giao hàng
          </Link>
        </div>
        <form action={logout} className="mt-4">
          <button className="h-12 w-full rounded-xl bg-cobalt text-sm font-bold text-white transition hover:bg-navy">
            Đăng xuất
          </button>
        </form>
      </div>
    );
  }

  const activeState =
    mode === "register"
      ? registerState
      : mode === "login"
        ? loginState
        : resetState;

  return (
    <div>
      {!configured && (
        <p
          role="status"
          className="mb-5 rounded-xl border border-coral/40 bg-coral/10 p-4 text-sm leading-6 text-navy"
        >
          Tài khoản đang chờ cấu hình Supabase. Thêm URL và publishable/anon
          key vào <code>.env.local</code> để bật xác thực.
        </p>
      )}
      {notice && (
        <FormMessage state={{ status: "error", message: notice }} />
      )}
      {mode !== "forgot" && (
        <div
          className="grid grid-cols-2 rounded-xl bg-mist p-1"
          aria-label="Chọn chế độ tài khoản"
        >
          <button
            type="button"
            onClick={() => setMode("register")}
            aria-pressed={mode === "register"}
            className={`h-11 rounded-[9px] text-sm font-bold transition ${
              mode === "register"
                ? "bg-navy text-white shadow-sm"
                : "text-muted"
            }`}
          >
            Đăng ký
          </button>
          <button
            type="button"
            onClick={() => setMode("login")}
            aria-pressed={mode === "login"}
            className={`h-11 rounded-[9px] text-sm font-bold transition ${
              mode === "login" ? "bg-navy text-white shadow-sm" : "text-muted"
            }`}
          >
            Đăng nhập
          </button>
        </div>
      )}
      <h2 className="sr-only">
        {mode === "register"
          ? "Tạo tài khoản"
          : mode === "login"
            ? "Đăng nhập"
            : "Đặt lại mật khẩu"}
      </h2>
      {mode === "forgot" ? (
        <>
          <p className="text-sm leading-6 text-muted">
            Nhập email đã đăng ký. Nếu tài khoản tồn tại, chúng tôi sẽ gửi
            hướng dẫn đặt lại mật khẩu.
          </p>
          <form action={resetAction} className="mt-5 space-y-4">
            <label
              htmlFor="reset-email"
              className="block text-sm font-semibold text-navy"
            >
              Email
              <input
                id="reset-email"
                required
                type="email"
                name="email"
                autoComplete="email"
                className="mt-2 h-12 w-full rounded-xl border border-line px-4 outline-none transition focus:border-cobalt focus:ring-4 focus:ring-cobalt/10"
                placeholder="ban@example.com"
              />
            </label>
            <button
              disabled={requestingReset}
              className="h-12 w-full rounded-xl bg-cobalt text-sm font-bold text-white transition hover:bg-navy disabled:cursor-not-allowed disabled:opacity-60"
            >
              {requestingReset ? "Đang gửi..." : "Gửi hướng dẫn"}
            </button>
          </form>
          <button
            type="button"
            onClick={() => setMode("login")}
            className="mt-4 text-sm font-bold text-cobalt hover:text-navy"
          >
            Quay lại đăng nhập
          </button>
        </>
      ) : (
        <>
          <div className="my-5 flex items-center gap-4 text-[11px] font-semibold uppercase tracking-wider text-muted">
            <span className="h-px flex-1 bg-line" />
            {mode === "register" ? "Tạo tài khoản bằng email" : "Dùng email"}
            <span className="h-px flex-1 bg-line" />
          </div>
          <form
            action={mode === "register" ? registerAction : loginAction}
            className="space-y-4"
          >
            {mode === "register" && (
              <label
                htmlFor="register-name"
                className="block text-sm font-semibold text-navy"
              >
                Họ và tên
                <input
                  id="register-name"
                  required
                  minLength={2}
                  maxLength={120}
                  name="name"
                  autoComplete="name"
                  className="mt-2 h-12 w-full rounded-xl border border-line px-4 outline-none transition focus:border-cobalt focus:ring-4 focus:ring-cobalt/10"
                  placeholder="Nguyễn Văn A"
                />
              </label>
            )}
            <label
              htmlFor={`${mode}-email`}
              className="block text-sm font-semibold text-navy"
            >
              Email
              <input
                id={`${mode}-email`}
                required
                type="email"
                name="email"
                autoComplete="email"
                className="mt-2 h-12 w-full rounded-xl border border-line px-4 outline-none transition focus:border-cobalt focus:ring-4 focus:ring-cobalt/10"
                placeholder="ban@example.com"
              />
            </label>
            <label
              htmlFor={`${mode}-password`}
              className="block text-sm font-semibold text-navy"
            >
              Mật khẩu
              <input
                id={`${mode}-password`}
                required
                name="password"
                minLength={mode === "register" ? 8 : 1}
                type="password"
                autoComplete={
                  mode === "register" ? "new-password" : "current-password"
                }
                className="mt-2 h-12 w-full rounded-xl border border-line px-4 outline-none transition focus:border-cobalt focus:ring-4 focus:ring-cobalt/10"
                placeholder={
                  mode === "register"
                    ? "Ít nhất 8 ký tự"
                    : "Nhập mật khẩu"
                }
              />
            </label>
            {mode === "register" && (
              <label
                htmlFor="register-confirm-password"
                className="block text-sm font-semibold text-navy"
              >
                Xác nhận mật khẩu
                <input
                  id="register-confirm-password"
                  required
                  name="confirmPassword"
                  minLength={8}
                  type="password"
                  autoComplete="new-password"
                  className="mt-2 h-12 w-full rounded-xl border border-line px-4 outline-none transition focus:border-cobalt focus:ring-4 focus:ring-cobalt/10"
                  placeholder="Nhập lại mật khẩu"
                />
              </label>
            )}
            {mode === "login" && (
              <div className="flex justify-end text-xs">
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="font-bold text-cobalt"
                >
                  Quên mật khẩu?
                </button>
              </div>
            )}
            <button
              disabled={mode === "register" ? registering : loggingIn}
              className="h-12 w-full rounded-xl bg-cobalt text-sm font-bold text-white shadow-[0_12px_28px_rgba(49,92,255,.22)] transition hover:bg-navy disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mode === "register"
                ? registering
                  ? "Đang tạo tài khoản..."
                  : "Tạo tài khoản"
                : loggingIn
                  ? "Đang đăng nhập..."
                  : "Đăng nhập"}
            </button>
          </form>
        </>
      )}
      <FormMessage state={activeState} />
      <p className="mt-5 text-center text-xs leading-5 text-muted">
        Bằng cách tiếp tục, bạn đồng ý với{" "}
        <Link href="/terms" className="font-bold text-cobalt hover:text-navy">
          Điều khoản sử dụng
        </Link>{" "}
        và{" "}
        <Link href="/privacy" className="font-bold text-cobalt hover:text-navy">
          Chính sách bảo mật
        </Link>
        .
      </p>
    </div>
  );
}
