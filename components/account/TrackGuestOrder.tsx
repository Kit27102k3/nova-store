"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { lookupGuestOrder, type GuestOrderSummary } from "@/app/actions/orders";
import { formatPrice } from "@/data/products";

const orderStatuses: Record<GuestOrderSummary["status"], string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

const paymentStatuses: Record<GuestOrderSummary["paymentStatus"], string> = {
  unpaid: "Chưa thanh toán",
  pending: "Đang chờ thanh toán",
  paid: "Đã thanh toán",
  failed: "Thanh toán thất bại",
  cancelled: "Đã hủy thanh toán",
};

export function TrackGuestOrder() {
  const [order, setOrder] = useState<GuestOrderSummary | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError("");
    setOrder(null);
    const form = new FormData(event.currentTarget);
    try {
      const result = await lookupGuestOrder(
        String(form.get("orderNumber") ?? ""),
        String(form.get("accessCode") ?? ""),
      );
      if (result.success) setOrder(result.order);
      else setError(result.message);
    } catch (caught) {
      console.error("Không thể tra cứu đơn hàng khách.", caught);
      setError("Chưa thể tra cứu đơn hàng. Vui lòng thử lại.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
      <form onSubmit={submit} className="h-fit rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-7">
        <h2 className="text-xl font-extrabold text-navy">Thông tin tra cứu</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Nhập mã đơn và mã tra cứu được cấp sau khi đặt hàng. Mã tra cứu bảo vệ thông tin đơn của bạn.
        </p>
        <label className="mt-5 block text-sm font-semibold text-navy">
          Mã đơn hàng
          <input
            required
            name="orderNumber"
            autoComplete="off"
            pattern="NV-[0-9]{4}-[0-9]{6,}"
            maxLength={32}
            placeholder="NV-2026-000001"
            className="mt-2 h-12 w-full rounded-xl border border-line px-4 outline-none focus:border-cobalt"
          />
        </label>
        <label className="mt-4 block text-sm font-semibold text-navy">
          Mã tra cứu
          <input
            required
            name="accessCode"
            autoComplete="off"
            minLength={32}
            maxLength={32}
            pattern="[A-Za-z0-9_-]{32}"
            className="mt-2 h-12 w-full rounded-xl border border-line px-4 font-mono outline-none focus:border-cobalt"
          />
        </label>
        {error && <p role="alert" className="mt-4 text-sm text-coral">{error}</p>}
        <button
          disabled={pending}
          className="mt-5 h-11 w-full rounded-full bg-navy text-sm font-bold text-white disabled:opacity-50"
        >
          {pending ? "Đang tra cứu..." : "Tra cứu đơn hàng"}
        </button>
      </form>

      {order ? (
        <section className="rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-7" aria-live="polite">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-cobalt">Đơn hàng</p>
              <h2 className="mt-1 text-xl font-extrabold text-navy">{order.orderNumber}</h2>
              <p className="mt-1 text-sm text-muted">
                {new Date(order.createdAt).toLocaleString("vi-VN")}
              </p>
            </div>
            <span className="rounded-full bg-mist px-3 py-1.5 text-sm font-bold text-navy">
              {orderStatuses[order.status]}
            </span>
          </div>
          <div className="mt-5 divide-y divide-line border-y border-line">
            {order.items.map((item, index) => (
              <div key={`${item.name}-${item.variant}-${index}`} className="flex justify-between gap-4 py-3 text-sm">
                <span className="text-muted">
                  {item.name}{item.variant ? ` · ${item.variant}` : ""}
                </span>
                <span className="shrink-0 font-bold text-navy">×{item.quantity}</span>
              </div>
            ))}
          </div>
          <dl className="mt-4 flex flex-wrap justify-between gap-3 text-sm">
            <div>
              <dt className="text-muted">Thanh toán</dt>
              <dd className="mt-1 font-semibold text-navy">
                {order.paymentMethod === "cod" ? "Thanh toán khi nhận hàng" : "VNPay"} · {paymentStatuses[order.paymentStatus]}
              </dd>
            </div>
            <div className="text-right">
              <dt className="text-muted">Tổng cộng</dt>
              <dd className="mt-1 text-lg font-extrabold text-navy">{formatPrice(order.total)}</dd>
            </div>
          </dl>
          {order.trackingUrl && (
            <a
              href={order.trackingUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex h-10 items-center rounded-full border border-cobalt px-5 text-sm font-bold text-cobalt hover:bg-mist"
            >
              Theo dõi vận chuyển
            </a>
          )}
          {order.events.length > 0 && (
            <ol className="mt-6 space-y-3 border-l-2 border-cobalt/20 pl-4">
              {order.events.map((event, index) => (
                <li key={`${event.createdAt}-${index}`} className="relative text-sm">
                  <span className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-cobalt" />
                  <p className="font-semibold text-navy">{event.title}</p>
                  <time className="mt-1 block text-xs text-muted" dateTime={event.createdAt}>
                    {new Date(event.createdAt).toLocaleString("vi-VN")}
                  </time>
                </li>
              ))}
            </ol>
          )}
        </section>
      ) : (
        <aside className="rounded-2xl bg-mist p-6 text-sm leading-6 text-muted">
          <h2 className="font-bold text-navy">Chưa có thông tin tra cứu</h2>
          <p className="mt-2">Đơn đặt bằng tài khoản vẫn có thể xem trong <Link href="/account/orders" className="font-bold text-cobalt underline">lịch sử đơn hàng</Link>.</p>
        </aside>
      )}
    </div>
  );
}
