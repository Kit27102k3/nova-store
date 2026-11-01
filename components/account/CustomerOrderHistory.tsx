"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelCustomerOrder } from "@/app/actions/customer";
import type { CustomerOrder } from "@/lib/supabase/customer";
import { formatPrice } from "@/data/products";
import { Icon } from "@/components/ui/Icon";

const statusLabels: Record<CustomerOrder["status"], string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};
const statusStyles: Record<CustomerOrder["status"], string> = {
  pending: "bg-[#fff4d8] text-[#8b6735]",
  confirmed: "bg-[#f1f2ff] text-cobalt",
  shipping: "bg-[#eef0ff] text-[#5552c7]",
  completed: "bg-[#eaf7f2] text-[#18795e]",
  cancelled: "bg-[#fff0ec] text-[#c25445]",
};

export function CustomerOrderHistory({
  orders,
}: {
  orders: CustomerOrder[];
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const cancel = (order: CustomerOrder) => {
    if (!window.confirm(`Bạn có chắc muốn hủy đơn ${order.order_number}?`)) {
      return;
    }
    const formData = new FormData();
    formData.set("id", String(order.id));
    startTransition(async () => {
      const result = await cancelCustomerOrder(formData);
      setMessage(result.message);
      if (result.success) router.refresh();
    });
  };

  if (orders.length === 0) {
    return (
      <section className="relative mt-8 overflow-hidden rounded-[30px] border border-line bg-white px-6 py-12 text-center shadow-soft sm:px-10 sm:py-16">
        <div className="pointer-events-none absolute -left-12 -top-16 size-48 rounded-full bg-electric/10 blur-3xl" />
        <div className="relative mx-auto grid size-20 place-items-center rounded-[28px] bg-gradient-to-br from-cobalt to-electric text-white shadow-lg shadow-electric/20">
          <Icon name="bag" className="size-9" />
        </div>
        <h2 className="relative mt-5 font-display text-3xl text-navy sm:text-4xl">
          Chưa có đơn hàng
        </h2>
        <p className="relative mx-auto mt-3 max-w-md text-sm leading-7 text-muted">
          Đơn hàng đã đặt bằng tài khoản này sẽ được lưu tại đây để bạn theo dõi
          trạng thái và xem lại chi tiết.
        </p>
        <Link
          href="/products"
          className="relative mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-navy px-7 text-sm font-bold text-white transition hover:bg-cobalt"
        >
          Bắt đầu mua sắm <Icon name="arrow" className="size-4" />
        </Link>
      </section>
    );
  }

  return (
    <section className="mt-8 space-y-4">
      {message && (
        <p
          role="status"
          className="rounded-xl border border-line bg-white p-4 text-sm text-navy"
        >
          {message}
        </p>
      )}
      {orders.map((order) => {
        const isExpanded = expanded === order.id;
        return (
          <article
            key={order.id}
            className="overflow-hidden rounded-[26px] border border-line bg-white shadow-soft"
          >
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-base font-extrabold text-cobalt">
                    {order.order_number}
                  </h2>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-bold ${statusStyles[order.status]}`}
                  >
                    {statusLabels[order.status]}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted">
                  Đặt ngày {formatDate(order.created_at)} · {order.items.length}{" "}
                  sản phẩm
                </p>
                <p className="mt-2 text-lg font-extrabold text-navy">
                  {formatPrice(order.total)}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() =>
                    setExpanded(isExpanded ? null : order.id)
                  }
                  className="h-10 rounded-full border border-line px-5 text-sm font-bold text-navy hover:border-cobalt"
                >
                  {isExpanded ? "Ẩn chi tiết" : "Chi tiết đơn"}
                </button>
                {order.status === "pending" && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => cancel(order)}
                    className="h-10 rounded-full border border-coral/40 px-5 text-sm font-bold text-coral hover:bg-coral/10 disabled:opacity-50"
                  >
                    {pending ? "Đang xử lý..." : "Hủy đơn"}
                  </button>
                )}
              </div>
            </div>
            {isExpanded && (
              <div className="grid gap-6 border-t border-line bg-[#fbfbfd] p-5 sm:grid-cols-2 sm:p-6">
                <div>
                  <h3 className="text-sm font-bold text-navy">
                    Địa chỉ giao hàng
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {order.customer_name} · {order.customer_phone}
                    <br />
                    {order.address}, {order.district}, {order.city}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Email: {order.customer_email}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-navy">
                    Sản phẩm trong đơn
                  </h3>
                  <ul className="mt-3 space-y-3">
                    {order.items.map((item, index) => (
                      <li
                        key={`${item.product_slug}-${index}`}
                        className="flex justify-between gap-3 text-sm"
                      >
                        <Link
                          href={`/products/${item.product_slug}`}
                          className="text-muted hover:text-cobalt"
                        >
                          {item.quantity}× {item.product_name}
                          {item.variant ? ` · ${item.variant}` : ""}
                        </Link>
                        <span className="shrink-0 font-semibold text-navy">
                          {formatPrice(item.unit_price * item.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <dl className="mt-4 space-y-2 border-t border-line pt-3 text-sm">
                    <div className="flex justify-between text-muted">
                      <dt>Tạm tính</dt>
                      <dd>{formatPrice(order.subtotal)}</dd>
                    </div>
                    <div className="flex justify-between text-muted">
                      <dt>Phí vận chuyển</dt>
                      <dd>
                        {order.shipping_fee
                          ? formatPrice(order.shipping_fee)
                          : "Miễn phí"}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
