import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { CustomerOrderHistory } from "@/components/account/CustomerOrderHistory";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { Icon } from "@/components/ui/Icon";
import { getCustomerOrders } from "@/lib/supabase/customer";

export const metadata: Metadata = { title: "Đơn hàng" };

export default function OrdersPage() {
  return (
    <div className="container-shell pb-20">
      <Breadcrumb
        items={[
          { label: "Tài khoản", href: "/account" },
          { label: "Đơn hàng" },
        ]}
      />
      <section className="relative mt-5 flex flex-wrap items-center justify-between gap-5 overflow-hidden rounded-[26px] bg-[linear-gradient(115deg,#111827_0%,#282d70_55%,#5b43cc_100%)] px-5 py-6 shadow-[0_20px_50px_-25px_rgba(49,92,255,0.65)] sm:px-8 sm:py-7">
        <div className="pointer-events-none absolute -right-10 -top-24 size-64 rounded-full border-[30px] border-white/10" />
        <div className="pointer-events-none absolute -bottom-24 right-1/3 size-48 rounded-full bg-[#dfff00]/20 blur-3xl" />
        <div className="max-w-2xl">
          <p className="text-[11px] font-extrabold uppercase tracking-[.2em] text-[#dfff00]">
            Lịch sử mua sắm
          </p>
          <h1 className="mt-2 font-sans text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
            Đơn hàng của tôi
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
            Theo dõi trạng thái giao hàng, xem lại sản phẩm và hủy đơn khi đơn
            vẫn đang chờ xác nhận.
          </p>
        </div>
        <Link
          href="/products"
          className="relative inline-flex h-11 items-center gap-2 rounded-full bg-[#dfff00] px-6 text-sm font-extrabold text-navy shadow-[0_8px_24px_-10px_rgba(223,255,0,0.9)] transition hover:bg-white"
        >
          Khám phá sản phẩm <Icon name="arrow" className="size-4" />
        </Link>
      </section>
      <Suspense
        fallback={
          <div
            aria-label="Đang tải đơn hàng"
            className="mt-5 h-40 animate-pulse rounded-2xl bg-mist"
          />
        }
      >
        <OrderSession />
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

async function OrderSession() {
  await connection();
  const result = await getCustomerOrders();
  if (!result.user || !result.data) {
    return (
      <section
        role={result.error.includes("đăng nhập") ? "status" : "alert"}
        className="mt-5 rounded-2xl border border-line bg-white px-6 py-9 text-center shadow-soft"
      >
        <h2 className="font-sans text-xl font-bold text-navy">
          {result.error.includes("đăng nhập")
            ? "Đăng nhập để xem đơn hàng"
            : "Chưa thể tải đơn hàng"}
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
    <>
      {result.notice && (
        <p
          role="status"
          className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"
        >
          {result.notice}
        </p>
      )}
      <CustomerOrderHistory orders={result.data} />
    </>
  );
}
