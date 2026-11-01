import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AddressBook } from "@/components/account/AddressBook";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { Icon } from "@/components/ui/Icon";
import { getCustomerAddresses } from "@/lib/supabase/customer";

export const metadata: Metadata = { title: "Địa chỉ" };

export default function AddressesPage() {
  return (
    <div className="container-shell pb-20">
      <Breadcrumb
        items={[
          { label: "Tài khoản", href: "/account" },
          { label: "Địa chỉ" },
        ]}
      />
      <section className="relative mt-6 overflow-hidden rounded-[32px] bg-gradient-to-br from-[#fff0ec] via-[#fff8f1] to-[#eff0ff] px-7 py-9 sm:px-12 sm:py-12">
        <div className="pointer-events-none absolute -right-10 -top-20 size-64 rounded-full border-[34px] border-white/50" />
        <div className="pointer-events-none absolute -bottom-24 right-1/4 size-48 rounded-full bg-coral/20 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="section-kicker">Sổ địa chỉ</p>
            <h1 className="font-display text-4xl leading-tight text-navy sm:text-5xl">
              Địa chỉ giao hàng
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-muted sm:text-base">
              Lưu nhiều địa chỉ nhận hàng, chọn địa chỉ mặc định và cập nhật
              thông tin giao hàng an toàn.
            </p>
          </div>
          <div className="grid size-16 place-items-center rounded-[22px] bg-white/80 text-coral shadow-soft">
            <Icon name="truck" className="size-8" />
          </div>
        </div>
      </section>
      <Suspense
        fallback={
          <div
            aria-label="Đang tải địa chỉ"
            className="mt-8 h-64 animate-pulse rounded-[28px] bg-mist"
          />
        }
      >
        <AddressSession />
      </Suspense>
      <Link
        href="/account"
        className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-navy transition hover:text-cobalt"
      >
        <span aria-hidden="true">←</span> Quay lại tài khoản
      </Link>
    </div>
  );
}

async function AddressSession() {
  const result = await getCustomerAddresses();
  if (!result.user || !result.data) {
    return (
      <section
        role={result.error.includes("đăng nhập") ? "status" : "alert"}
        className="mt-8 rounded-[28px] border border-line bg-white px-6 py-12 text-center shadow-soft"
      >
        <h2 className="font-display text-2xl text-navy">
          {result.error.includes("đăng nhập")
            ? "Đăng nhập để quản lý địa chỉ"
            : "Chưa thể tải sổ địa chỉ"}
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted">
          {result.error}
        </p>
        <Link
          href="/account"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-navy px-6 text-sm font-bold text-white hover:bg-cobalt"
        >
          Đến trang tài khoản
        </Link>
      </section>
    );
  }
  return <AddressBook addresses={result.data} />;
}
