import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Đơn hàng" };

export default function OrdersPage() {
  return <div className="container-shell pb-20">
    <Breadcrumb items={[{ label: "Tài khoản", href: "/account" }, { label: "Đơn hàng" }]} />
    <section className="relative mt-6 overflow-hidden rounded-[32px] bg-gradient-to-br from-[#eef0ff] via-[#f7f5ff] to-[#fff0ec] px-7 py-9 sm:px-12 sm:py-12">
      <div className="pointer-events-none absolute -right-10 -top-20 size-64 rounded-full border-[34px] border-white/50" />
      <div className="pointer-events-none absolute -bottom-24 right-1/4 size-48 rounded-full bg-lime/50 blur-3xl" />
      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <p className="section-kicker">Lịch sử mua sắm</p>
          <h1 className="font-display text-4xl leading-tight text-navy sm:text-5xl">Đơn hàng của tôi</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-muted sm:text-base">Mọi hành trình mua sắm của bạn đều được lưu lại tại đây. Theo dõi đơn hàng và cập nhật trạng thái chỉ trong một nơi.</p>
        </div>
        <Link href="/products" className="inline-flex h-12 items-center gap-2 rounded-full bg-navy px-6 text-sm font-bold text-white transition hover:bg-cobalt">
          Khám phá sản phẩm <Icon name="arrow" className="size-4" />
        </Link>
      </div>
      <div className="relative mt-9 flex flex-wrap gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/75 px-4 py-2 text-xs font-bold text-navy"><Icon name="truck" className="size-4 text-cobalt" /> Theo dõi giao hàng</span>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/75 px-4 py-2 text-xs font-bold text-navy"><Icon name="return" className="size-4 text-coral" /> Lịch sử mua sắm</span>
      </div>
    </section>

    <section className="relative mt-8 overflow-hidden rounded-[30px] border border-line bg-white px-6 py-12 text-center shadow-soft sm:px-10 sm:py-16">
      <div className="pointer-events-none absolute -left-12 -top-16 size-48 rounded-full bg-electric/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-10 size-56 rounded-full bg-coral/10 blur-3xl" />
      <div className="relative mx-auto max-w-lg">
        <div className="mx-auto grid size-20 place-items-center rounded-[28px] bg-gradient-to-br from-cobalt to-electric text-white shadow-lg shadow-electric/20">
          <Icon name="bag" className="size-9" />
        </div>
        <span className="mt-6 inline-flex rounded-full bg-lime/60 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[.16em] text-navy">Chuyến mua sắm đầu tiên đang chờ</span>
        <h2 className="mt-4 font-display text-3xl text-navy sm:text-4xl">Chưa có đơn hàng</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted">Tài khoản demo chưa có lịch sử giao dịch. Khám phá những lựa chọn mới và tìm món đồ dành riêng cho bạn.</p>
        <Link href="/products" className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-navy px-7 text-sm font-bold text-white transition hover:bg-cobalt">
          Bắt đầu mua sắm <Icon name="arrow" className="size-4" />
        </Link>
      </div>
    </section>
    <Link href="/account" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-navy transition hover:text-cobalt"><span aria-hidden="true">←</span> Quay lại tài khoản</Link>
  </div>;
}
