import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Địa chỉ" };

export default function AddressesPage() {
  return <div className="container-shell pb-20">
    <Breadcrumb items={[{ label: "Tài khoản", href: "/account" }, { label: "Địa chỉ" }]} />
    <section className="relative mt-6 overflow-hidden rounded-[32px] bg-gradient-to-br from-[#fff0ec] via-[#fff8f1] to-[#eff0ff] px-7 py-9 sm:px-12 sm:py-12">
      <div className="pointer-events-none absolute -right-10 -top-20 size-64 rounded-full border-[34px] border-white/50" />
      <div className="pointer-events-none absolute -bottom-24 right-1/4 size-48 rounded-full bg-coral/20 blur-3xl" />
      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <p className="section-kicker">Sổ địa chỉ</p>
          <h1 className="font-display text-4xl leading-tight text-navy sm:text-5xl">Địa chỉ giao hàng</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-muted sm:text-base">Lưu địa chỉ nhận hàng để những lần mua sắm tiếp theo nhanh chóng và thuận tiện hơn.</p>
        </div>
        <div className="grid size-16 place-items-center rounded-[22px] bg-white/80 text-coral shadow-soft">
          <Icon name="truck" className="size-8" />
        </div>
      </div>
      <div className="relative mt-8 flex items-center gap-3 text-xs font-bold text-navy">
        <span className="grid size-8 place-items-center rounded-full bg-lime text-navy"><Icon name="check" className="size-4" /></span>
        Quản lý nơi nhận hàng của bạn
      </div>
    </section>

    <div className="mt-8 grid gap-5 md:grid-cols-2">
      <section className="group relative overflow-hidden rounded-[28px] border border-line bg-white p-7 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-8">
        <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-coral via-[#ffad66] to-lime" />
        <div className="flex items-start justify-between gap-4">
          <div className="grid size-12 place-items-center rounded-2xl bg-coral/10 text-coral"><Icon name="user" className="size-6" /></div>
          <span className="rounded-full bg-lime/60 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-navy">Mặc định</span>
        </div>
        <p className="mt-6 text-xs font-extrabold uppercase tracking-[.16em] text-coral">Địa chỉ mặc định</p>
        <h2 className="mt-2 font-display text-2xl text-navy">Nhà riêng</h2>
        <div className="mt-4 rounded-2xl bg-mist/80 p-4">
          <p className="text-sm leading-7 text-muted">Hãy đăng nhập và kết nối backend để lưu địa chỉ giao hàng của bạn.</p>
        </div>
        <button type="button" className="mt-6 inline-flex h-11 items-center gap-2 rounded-full border border-navy px-5 text-sm font-bold text-navy transition hover:bg-navy hover:text-white">
          Chỉnh sửa <Icon name="arrow" className="size-4" />
        </button>
      </section>

      <button type="button" className="group relative flex min-h-64 flex-col items-center justify-center overflow-hidden rounded-[28px] border-2 border-dashed border-electric/30 bg-gradient-to-br from-electric/5 via-white to-cobalt/5 p-7 text-center transition hover:border-electric hover:shadow-soft">
        <span className="absolute -right-8 -top-8 size-28 rounded-full bg-electric/10 transition group-hover:scale-125" />
        <span className="relative grid size-14 place-items-center rounded-full bg-electric text-white shadow-lg shadow-electric/20 transition group-hover:rotate-90">
          <Icon name="plus" className="size-6" />
        </span>
        <b className="relative mt-5 font-display text-2xl text-navy">Thêm địa chỉ mới</b>
        <span className="relative mt-2 max-w-xs text-sm leading-6 text-muted">Tạo một địa chỉ nhận hàng mới để tiện cho đơn hàng tiếp theo.</span>
        <span className="relative mt-4 rounded-full bg-white px-4 py-2 text-xs font-bold text-electric shadow-sm">Tính năng demo</span>
      </button>
    </div>
    <Link href="/account" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-navy transition hover:text-cobalt"><span aria-hidden="true">←</span> Quay lại tài khoản</Link>
  </div>;
}
