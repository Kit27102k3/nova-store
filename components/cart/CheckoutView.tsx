"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { useStore } from "@/components/store-context";
import { placeStoreOrder } from "@/app/actions/orders";
import { formatPrice } from "@/data/products";

type CheckoutCustomer = {
  email: string;
  name: string;
  phone: string;
  address: {
    name: string;
    phone: string;
    street: string;
    district: string;
    city: string;
  } | null;
};

export function CheckoutView({
  customer,
}: {
  customer: CheckoutCustomer | null;
}) {
  const { cart, clearCart, products, settings } = useStore();
  const [complete, setComplete] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const items = cart.flatMap((item) => {
    const product = products.find((entry) => entry.id === item.productId);
    return product ? [{ ...item, product }] : [];
  });
  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );
  const shipping =
    subtotal >= settings.shippingThreshold ? 0 : settings.shippingFee;
  const field =
    "mt-2 h-12 w-full rounded-xl border border-line bg-white px-4 outline-none focus:border-cobalt";

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    const formData = new FormData(event.currentTarget);
    const orderItems = items.map(({ product, quantity, variant }) => ({
      product_id: product.id,
      quantity,
      variant: variant ?? null,
    }));
    startTransition(async () => {
      const result = await placeStoreOrder(formData, orderItems);
      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }
      clearCart();
      setComplete(result.orderNumber);
    });
  };

  if (complete) {
    return (
      <div className="container-shell pb-20">
        <Breadcrumb items={[{ label: "Thanh toán" }]} />
        <div className="mx-auto mt-14 max-w-xl rounded-[28px] bg-mist px-6 py-16 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-lime text-2xl text-navy">
            ✓
          </div>
          <h1 className="mt-6 font-display text-4xl text-navy">
            Đơn hàng đã được ghi nhận
          </h1>
          <p className="mt-4 text-sm leading-7 text-muted">
            Mã đơn hàng của bạn là{" "}
            <strong className="text-navy">{complete}</strong>. Chúng tôi sẽ liên
            hệ để xác nhận đơn hàng và thanh toán khi nhận hàng.
          </p>
          <Link
            href="/products"
            className="mt-8 inline-flex h-12 items-center rounded-full bg-navy px-7 text-sm font-bold text-white"
          >
            Tiếp tục mua sắm
          </Link>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="container-shell pb-20">
        <Breadcrumb items={[{ label: "Thanh toán" }]} />
        <div className="mt-14 rounded-[28px] bg-mist py-16 text-center">
          <h1 className="font-display text-4xl text-navy">
            Giỏ hàng đang trống
          </h1>
          <Link
            href="/cart"
            className="mt-7 inline-flex h-12 items-center rounded-full bg-navy px-7 text-sm font-bold text-white"
          >
            Quay lại giỏ hàng
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-shell pb-20">
      <Breadcrumb
        items={[
          { label: "Giỏ hàng", href: "/cart" },
          { label: "Thanh toán" },
        ]}
      />
      <h1 className="mt-8 font-display text-4xl text-navy sm:text-5xl">
        Thanh toán
      </h1>
      <form
        onSubmit={submit}
        className="mt-10 grid gap-10 lg:grid-cols-[1fr_390px]"
      >
        <section className="space-y-8">
          <div className="rounded-[24px] border border-line p-6 sm:p-8">
            <h2 className="font-display text-2xl text-navy">
              Thông tin liên hệ
            </h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-semibold text-navy">
                Họ và tên
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  className={field}
                  name="name"
                  autoComplete="name"
                  defaultValue={customer?.address?.name ?? customer?.name}
                />
              </label>
              <label className="text-sm font-semibold text-navy">
                Email
                <input
                  required
                  type="email"
                  maxLength={254}
                  name="email"
                  autoComplete="email"
                  defaultValue={customer?.email}
                  readOnly={Boolean(customer)}
                  className={`${field} ${customer ? "bg-mist text-muted" : ""}`}
                />
              </label>
              <label className="text-sm font-semibold text-navy sm:col-span-2">
                Số điện thoại
                <input
                  required
                  type="tel"
                  minLength={6}
                  maxLength={32}
                  className={field}
                  name="phone"
                  autoComplete="tel"
                  defaultValue={customer?.address?.phone ?? customer?.phone}
                />
              </label>
            </div>
          </div>
          <div className="rounded-[24px] border border-line p-6 sm:p-8">
            <h2 className="font-display text-2xl text-navy">
              Địa chỉ giao hàng
            </h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-semibold text-navy sm:col-span-2">
                Địa chỉ
                <input
                  required
                  minLength={3}
                  maxLength={240}
                  className={field}
                  name="address"
                  autoComplete="street-address"
                  defaultValue={customer?.address?.street}
                />
              </label>
              <label className="text-sm font-semibold text-navy">
                Quận / Huyện
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  className={field}
                  name="district"
                  defaultValue={customer?.address?.district}
                />
              </label>
              <label className="text-sm font-semibold text-navy">
                Tỉnh / Thành phố
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  className={field}
                  name="city"
                  autoComplete="address-level1"
                  defaultValue={customer?.address?.city}
                />
              </label>
            </div>
          </div>
        </section>
        <aside className="h-fit rounded-[24px] bg-mist p-6 sm:p-8">
          <h2 className="font-display text-2xl text-navy">Đơn hàng</h2>
          <div className="mt-6 space-y-4">
            {items.map(({ product, quantity, variant }) => (
              <div
                key={`${product.id}-${variant ?? "default"}`}
                className="flex justify-between gap-4 text-sm"
              >
                <span className="text-muted">
                  <b className="text-navy">{quantity}×</b> {product.name}
                  {variant ? ` · ${variant}` : ""}
                </span>
                <b className="shrink-0 text-navy">
                  {formatPrice(product.price * quantity)}
                </b>
              </div>
            ))}
          </div>
          <dl className="mt-6 space-y-3 border-t border-line pt-5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Vận chuyển</dt>
              <dd>{shipping ? formatPrice(shipping) : "Miễn phí"}</dd>
            </div>
            <div className="flex justify-between font-bold text-navy">
              <dt>Tổng cộng</dt>
              <dd className="text-lg">{formatPrice(subtotal + shipping)}</dd>
            </div>
          </dl>
          {errorMessage && (
            <p
              role="alert"
              className="mt-5 rounded-xl border border-coral/40 bg-coral/10 p-3 text-sm text-navy"
            >
              {errorMessage}
            </p>
          )}
          <button
            disabled={pending}
            className="mt-6 h-12 w-full rounded-full bg-navy text-sm font-bold text-white hover:bg-cobalt disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? "Đang ghi nhận..." : "Đặt hàng"}
          </button>
          <p className="mt-4 text-center text-xs leading-5 text-muted">
            Thanh toán khi nhận hàng. Giá và tồn kho được xác minh khi đặt hàng.
          </p>
        </aside>
      </form>
    </div>
  );
}
