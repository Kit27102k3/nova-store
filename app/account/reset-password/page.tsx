import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/account/ResetPasswordForm";

export const metadata: Metadata = { title: "Đặt lại mật khẩu" };

export default function ResetPasswordPage() {
  return (
    <div className="container-shell pb-20">
      <section className="mx-auto mt-10 max-w-xl rounded-[32px] border border-line bg-white p-6 shadow-soft sm:p-10">
        <p className="section-kicker">Bảo mật tài khoản</p>
        <h1 className="mt-3 font-display text-3xl text-navy sm:text-4xl">
          Đặt lại mật khẩu
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Chọn mật khẩu mới để tiếp tục sử dụng tài khoản Nova Store.
        </p>
        <ResetPasswordForm />
        <Link
          href="/account"
          className="mt-5 inline-block text-sm font-bold text-cobalt hover:text-navy"
        >
          Quay lại tài khoản
        </Link>
      </section>
    </div>
  );
}
