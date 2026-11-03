import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
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
      <section className="relative mt-5 flex flex-wrap items-center justify-between gap-5 overflow-hidden rounded-[26px] bg-[linear-gradient(115deg,#111827_0%,#282d70_55%,#5b43cc_100%)] px-5 py-6 shadow-[0_20px_50px_-25px_rgba(49,92,255,0.65)] sm:px-8 sm:py-7">
        <div className="pointer-events-none absolute -right-10 -top-24 size-64 rounded-full border-[30px] border-white/10" />
        <div className="pointer-events-none absolute -bottom-24 right-1/3 size-48 rounded-full bg-[#dfff00]/20 blur-3xl" />
        <div className="relative max-w-2xl">
            <p className="text-[11px] font-extrabold uppercase tracking-[.2em] text-[#dfff00]">
              Sổ địa chỉ
            </p>
            <h1 className="mt-2 font-sans text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
              Địa chỉ giao hàng
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
              Lưu nhiều địa chỉ nhận hàng, chọn địa chỉ mặc định và cập nhật
              thông tin giao hàng an toàn.
            </p>
        </div>
        <div className="relative grid size-14 place-items-center rounded-2xl bg-white/10 text-[#dfff00] ring-1 ring-white/15 backdrop-blur">
          <Icon name="truck" className="size-7" />
        </div>
      </section>
      <Suspense
        fallback={
          <div
            aria-label="Đang tải địa chỉ"
            className="mt-5 h-48 animate-pulse rounded-2xl bg-mist"
          />
        }
      >
        <AddressSession />
      </Suspense>
      <Link
        href="/account"
        className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-navy transition hover:text-cobalt"
      >
        <span aria-hidden="true">←</span> Quay lại tài khoản
      </Link>
    </div>
  );
}

async function AddressSession() {
  await connection();
  const result = await getCustomerAddresses();
  if (!result.user || !result.data) {
    return (
      <section
        role={result.error.includes("đăng nhập") ? "status" : "alert"}
        className="mt-5 rounded-2xl border border-line bg-white px-6 py-9 text-center shadow-soft"
      >
        <h2 className="font-sans text-xl font-bold text-navy">
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
  return (
    <AddressBook
      addresses={result.data}
      customerId={result.user.id}
      mode={result.mode}
      notice={result.notice}
    />
  );
}
