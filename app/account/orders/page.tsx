import type { Metadata } from "next";
import Link from "next/link";
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
      <section className="relative mt-6 overflow-hidden rounded-[32px] bg-gradient-to-br from-[#eef0ff] via-[#f7f5ff] to-[#fff0ec] px-7 py-9 sm:px-12 sm:py-12">
        <div className="pointer-events-none absolute -right-10 -top-20 size-64 rounded-full border-[34px] border-white/50" />
        <div className="pointer-events-none absolute -bottom-24 right-1/4 size-48 rounded-full bg-lime/50 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="section-kicker">Lịch sử mua sắm</p>
            <h1 className="font-display text-4xl leading-tight text-navy sm:text-5xl">
              Đơn hàng của tôi
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-muted sm:text-base">
              Theo dõi trạng thái giao hàng, xem lại sản phẩm và hủy đơn khi
              đơn vẫn đang chờ xác nhận.
            </p>
          </div>
          <Link
            href="/products"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-navy px-6 text-sm font-bold text-white transition hover:bg-cobalt"
          >
            Khám phá sản phẩm <Icon name="arrow" className="size-4" />
          </Link>
        </div>
      </section>
      <Suspense
        fallback={
          <div
            aria-label="Đang tải đơn hàng"
            className="mt-8 h-64 animate-pulse rounded-[28px] bg-mist"
          />
        }
      >
        <OrderSession />
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

async function OrderSession() {
  const result = await getCustomerOrders();
  if (!result.user || !result.data) {
    return (
      <section
        role={result.error.includes("đăng nhập") ? "status" : "alert"}
        className="mt-8 rounded-[28px] border border-line bg-white px-6 py-12 text-center shadow-soft"
      >
        <h2 className="font-display text-2xl text-navy">
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
  return <CustomerOrderHistory orders={result.data} />;
}
