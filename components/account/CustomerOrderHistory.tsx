"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
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
  pending: "border border-amber-200 bg-amber-100 text-amber-900",
  confirmed: "border border-indigo-200 bg-indigo-100 text-indigo-800",
  shipping: "border border-sky-200 bg-sky-100 text-sky-800",
  completed: "border border-emerald-200 bg-emerald-100 text-emerald-800",
  cancelled: "border border-rose-200 bg-rose-100 text-rose-800",
};
const paymentMethodLabels: Record<CustomerOrder["payment_method"], string> = {
  cod: "Thanh toán khi nhận hàng",
  vnpay: "VNPay",
};
const paymentStatusLabels: Record<CustomerOrder["payment_status"], string> = {
  unpaid: "Chưa thanh toán",
  pending: "Đang chờ thanh toán",
  paid: "Đã thanh toán",
  failed: "Thanh toán thất bại",
  cancelled: "Đã hủy thanh toán",
};
const orderFilters = [
  { value: "all", label: "Tất cả" },
  { value: "pending", label: "Chờ xác nhận" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "shipping", label: "Đang giao" },
  { value: "completed", label: "Hoàn thành" },
  { value: "cancelled", label: "Đã hủy" },
] as const;
type OrderFilter = (typeof orderFilters)[number]["value"];

export function CustomerOrderHistory({
  orders,
}: {
  orders: CustomerOrder[];
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [query, setQuery] = useState("");

  const filteredOrders = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("vi");
    return orders.filter((order) => {
      const matchesStatus = filter === "all" || order.status === filter;
      const matchesQuery =
        !term ||
        order.order_number.toLocaleLowerCase("vi").includes(term) ||
        order.items.some((item) =>
          item.product_name.toLocaleLowerCase("vi").includes(term),
        );
      return matchesStatus && matchesQuery;
    });
  }, [filter, orders, query]);

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
      <section className="mt-5 overflow-hidden rounded-[26px] border border-[#e7e8f4] bg-[linear-gradient(140deg,#fff_0%,#f2f3ff_55%,#fff0ea_100%)] px-5 py-9 text-center shadow-soft sm:px-8">
        <div className="mx-auto grid size-16 place-items-center rounded-[22px] bg-[linear-gradient(140deg,#315cff,#6d5dfc)] text-white shadow-lg shadow-cobalt/25">
          <Icon name="bag" className="size-7" />
        </div>
        <h2 className="mt-4 font-sans text-xl font-bold text-navy">
          Chưa có đơn hàng
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
          Đơn hàng đã đặt bằng tài khoản này sẽ được lưu tại đây để bạn theo dõi
          trạng thái và xem lại chi tiết.
        </p>
        <Link
          href="/products"
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-navy px-6 text-sm font-bold text-white transition hover:bg-cobalt"
        >
          Bắt đầu mua sắm <Icon name="arrow" className="size-4" />
        </Link>
      </section>
    );
  }

  return (
    <section className="mt-5">
      <div className="overflow-hidden rounded-2xl border border-[#dfe2f1] bg-white shadow-[0_18px_45px_-30px_rgba(49,92,255,0.45)]">
        <div className="border-b border-white/10 bg-[#151a35]">
          <div
            role="tablist"
            aria-label="Lọc đơn hàng theo trạng thái"
            className="grid grid-cols-3 sm:flex sm:min-w-max"
          >
            {orderFilters.map((item) => {
              const count =
                item.value === "all"
                  ? orders.length
                  : orders.filter((order) => order.status === item.value).length;
              const active = filter === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(item.value)}
                  className={`border-b-2 px-1.5 py-3 text-[10px] font-bold leading-tight transition sm:px-6 sm:py-4 sm:text-sm ${
                    active
                      ? "border-[#dfff00] bg-white/[0.06] text-white"
                      : "border-transparent text-white/60 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  {item.label}
                  <span
                    className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                      active
                        ? "bg-[#dfff00] font-extrabold text-navy"
                        : "bg-white/10 text-white/70"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col gap-3 bg-gradient-to-r from-[#f0f2ff] via-white to-[#fff3ef] p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-navy">
            <span className="mr-2 inline-grid size-7 place-items-center rounded-lg bg-cobalt text-xs font-extrabold text-white">
              {filteredOrders.length}
            </span>
            đơn hàng{filter === "all" ? " gần đây" : ` · ${statusLabels[filter]}`}
          </p>
          <label className="relative block sm:w-72">
            <span className="sr-only">Tìm mã đơn hoặc tên sản phẩm</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm mã đơn, tên sản phẩm"
              className="h-10 w-full rounded-lg border border-[#dfe2f1] bg-white px-3 text-sm outline-none transition placeholder:text-muted focus:border-cobalt focus:ring-4 focus:ring-cobalt/10"
            />
          </label>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {message && (
          <p
            role="status"
            className="rounded-xl border border-line bg-white px-4 py-3 text-sm text-navy"
          >
            {message}
          </p>
        )}
        {filteredOrders.map((order) => {
          const isExpanded = expanded === order.id;
          return (
            <article
              key={order.id}
              className="overflow-hidden rounded-2xl border border-[#e2e5f1] bg-white shadow-[0_12px_32px_-25px_rgba(17,24,39,0.45)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_-24px_rgba(49,92,255,0.38)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[linear-gradient(105deg,#171c39_0%,#292d65_70%,#3b3484_100%)] px-4 py-3.5 sm:px-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-xs font-extrabold tracking-wide text-[#dfff00]">NOVA STORE</span>
                  <span className="text-xs font-bold text-white">{order.order_number}</span>
                  <span className="text-xs text-white/55">
                    {formatDate(order.created_at)}
                  </span>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusStyles[order.status]}`}
                >
                  {statusLabels[order.status]}
                </span>
              </div>
              <div className="divide-y divide-line px-4 sm:px-5">
                {order.items.map((item, index) => (
                  <div
                    key={`${item.product_slug}-${index}`}
                    className="flex flex-wrap items-center justify-between gap-3 py-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[linear-gradient(145deg,#e8ebff,#fbe9e5)] text-cobalt">
                        <Icon name="bag" className="size-5" />
                      </span>
                      <div className="min-w-0">
                      <Link
                        href={`/products/${item.product_slug}`}
                        className="text-sm font-bold text-navy hover:text-cobalt"
                      >
                        {item.product_name}
                      </Link>
                      <p className="mt-1 text-xs text-muted">
                        {item.variant ? `Phân loại: ${item.variant} · ` : ""}
                        x{item.quantity}
                      </p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-navy">
                      {formatPrice(item.unit_price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e8e9f4] bg-gradient-to-r from-[#f0f2ff] to-[#fff2ed] px-4 py-4 sm:px-5">
                <p className="text-xs font-semibold text-muted">
                  {order.items.length} sản phẩm trong đơn
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="mr-2 text-sm font-semibold text-navy">
                    Thành tiền{" "}
                    <span className="font-extrabold text-[#e24747]">
                      {formatPrice(order.total)}
                    </span>
                    {order.voucher_code && (
                      <span className="ml-2 text-xs font-semibold text-cobalt">
                        {order.voucher_code} · −{formatPrice(order.discount_amount)}
                      </span>
                    )}
                  </p>
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() =>
                    setExpanded(isExpanded ? null : order.id)
                  }
                  className="h-9 rounded-lg border border-cobalt/30 bg-white px-4 text-xs font-extrabold text-cobalt transition hover:bg-cobalt hover:text-white"
                >
                  {isExpanded ? "Ẩn chi tiết" : "Chi tiết đơn"}
                </button>
                {order.status === "pending" &&
                  !(
                    order.payment_method === "vnpay" &&
                    order.payment_status === "pending"
                  ) && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => cancel(order)}
                    className="h-9 rounded-lg bg-coral px-4 text-xs font-extrabold text-white transition hover:bg-[#e3413a] disabled:opacity-50"
                  >
                    {pending ? "Đang xử lý..." : "Hủy đơn"}
                  </button>
                )}
              </div>
              </div>
            {isExpanded && (
              <div className="grid gap-5 border-t border-line bg-[#fbfbfd] p-4 sm:p-5 xl:grid-cols-2">
                <div>
                  <h3 className="text-sm font-bold text-navy">
                    Địa chỉ giao hàng
                  </h3>
                  <p className="mt-1.5 text-sm leading-5 text-muted">
                    {order.customer_name} · {order.customer_phone}
                    <br />
                    {order.address}, {order.district}, {order.city}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Email: {order.customer_email}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-muted">
                    Thanh toán: {paymentMethodLabels[order.payment_method]} ·{" "}
                    <span
                      className={
                        order.payment_status === "paid"
                          ? "font-bold text-emerald-700"
                          : order.payment_status === "failed"
                            ? "font-bold text-rose-700"
                            : "font-semibold text-navy"
                      }
                    >
                      {paymentStatusLabels[order.payment_status]}
                    </span>
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-navy">
                    Sản phẩm trong đơn
                  </h3>
                  <ul className="mt-2 space-y-2">
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
                  <dl className="mt-3 space-y-2 border-t border-line pt-3 text-sm">
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
                    {order.discount_amount > 0 && (
                      <div className="flex justify-between font-semibold text-cobalt">
                        <dt>
                          Giảm giá{order.voucher_code ? ` · ${order.voucher_code}` : ""}
                        </dt>
                        <dd>−{formatPrice(order.discount_amount)}</dd>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-navy">
                      <dt>Tổng cộng</dt>
                      <dd>{formatPrice(order.total)}</dd>
                    </div>
                  </dl>
                </div>
                <section className="xl:col-span-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-navy">
                        Theo dõi vận chuyển
                      </h3>
                      <p className="mt-1 text-xs text-muted">
                        {order.ghn_order_code
                          ? `Đơn vị vận chuyển GHN · Mã ${order.ghn_order_code}`
                          : "Mã vận đơn sẽ hiển thị sau khi cửa hàng bàn giao đơn cho GHN."}
                      </p>
                      {order.shipping_status_label && (
                        <p className="mt-2 text-sm font-bold text-cobalt">
                          {order.shipping_status_label}
                        </p>
                      )}
                    </div>
                    {order.shipping_tracking_url && (
                      <a
                        href={order.shipping_tracking_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-9 items-center rounded-full bg-cobalt px-4 text-xs font-bold text-white transition hover:bg-navy"
                      >
                        Tra cứu trên GHN
                      </a>
                    )}
                  </div>
                  {order.events.length > 0 ? (
                    <ol className="mt-4 grid gap-3 sm:grid-cols-2">
                      {order.events.map((event, index) => (
                        <li
                          key={event.id}
                          className="flex gap-3 rounded-xl border border-[#e8e9f4] bg-white p-3"
                        >
                          <span
                            className={`mt-1 grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-extrabold ${
                              index === order.events.length - 1
                                ? "bg-cobalt text-white"
                                : "bg-[#eef0ff] text-cobalt"
                            }`}
                          >
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-navy">
                              {event.title}
                            </p>
                            {event.description && (
                              <p className="mt-1 break-words text-xs leading-5 text-muted">
                                {event.description}
                              </p>
                            )}
                            <time
                              dateTime={event.created_at}
                              className="mt-1 block text-[11px] text-muted"
                            >
                              {formatDate(event.created_at)}
                            </time>
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="mt-3 rounded-xl bg-white p-3 text-xs text-muted">
                      Chưa có cập nhật vận chuyển.
                    </p>
                  )}
                </section>
              </div>
            )}
            </article>
          );
        })}
        {filteredOrders.length === 0 && (
          <div className="rounded-xl border border-line bg-gradient-to-br from-white to-[#f7f7ff] px-5 py-10 text-center">
            <h2 className="font-sans font-bold text-navy">Không tìm thấy đơn hàng</h2>
            <p className="mt-1 text-sm text-muted">
              Thử đổi trạng thái lọc hoặc từ khóa tìm kiếm.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
