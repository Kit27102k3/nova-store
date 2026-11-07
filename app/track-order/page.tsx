import type { Metadata } from "next";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { TrackGuestOrder } from "@/components/account/TrackGuestOrder";

export const metadata: Metadata = { title: "Tra cứu đơn hàng" };

export default function TrackOrderPage() {
  return (
    <div className="container-shell pb-20">
      <Breadcrumb items={[{ label: "Tra cứu đơn hàng" }]} />
      <header className="mt-6 rounded-[28px] bg-gradient-to-br from-[#eef0ff] via-white to-[#fff0ec] p-6 sm:p-10">
        <p className="section-kicker">Theo dõi đơn hàng</p>
        <h1 className="mt-2 font-display text-4xl text-navy">Tra cứu đơn khách</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
          Dùng mã đơn và mã tra cứu riêng được cấp khi đặt hàng để xem tiến độ giao hàng.
        </p>
      </header>
      <TrackGuestOrder />
    </div>
  );
}
