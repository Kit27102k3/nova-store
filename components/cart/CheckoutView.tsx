"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { AddressPicker } from "@/components/address/AddressPicker";
import { useStore } from "@/components/store-context";
import {
  placeStoreOrder,
  verifyVnpayReturnToken,
} from "@/app/actions/orders";
import { quoteStoreVoucher } from "@/app/actions/vouchers";
import { VoucherPicker } from "@/components/cart/VoucherPicker";
import { formatPrice } from "@/data/products";
import type { DeliveryAddressSuggestion } from "@/lib/geocoding/types";
import type { VoucherQuote } from "@/lib/vouchers";

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
  const searchParams = useSearchParams();
  const requestedVoucher = searchParams.get("voucher")?.trim().toUpperCase() ?? "";
  const [complete, setComplete] = useState("");
  const [completeMethod, setCompleteMethod] = useState<"cod" | "vnpay">("cod");
  const [errorMessage, setErrorMessage] = useState("");
  const [paymentNotice, setPaymentNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const [voucherCode, setVoucherCode] = useState(requestedVoucher);
  const [voucherState, setVoucherState] = useState<{
    cartKey: string;
    quote: VoucherQuote;
  } | null>(null);
  const [voucherError, setVoucherError] = useState("");
  const [voucherDismissed, setVoucherDismissed] = useState(false);
  const [voucherRequest, setVoucherRequest] = useState<{
    id: number;
    cartKey: string;
  } | null>(null);
  const cartKey = JSON.stringify(cart);
  const voucherRequestId = useRef(0);
  const checkingVoucher = voucherRequest?.cartKey === cartKey;
  const verifiedVoucher =
    voucherState?.cartKey === cartKey ? voucherState.quote : null;
  const isVnpayReturn = searchParams.get("payment") === "return";
  const returnToken = searchParams.get("token");
  const visiblePaymentNotice =
    paymentNotice ||
    (isVnpayReturn && !returnToken
      ? "Không xác minh được kết quả trả về từ VNPay."
      : "");
  const [deliveryAddress, setDeliveryAddress] = useState({
    street: customer?.address?.street ?? "",
    district: customer?.address?.district ?? "",
    city: customer?.address?.city ?? "",
  });
  const items = useMemo(
    () =>
      cart.flatMap((item) => {
        const product = products.find((entry) => entry.id === item.productId);
        return product ? [{ ...item, product }] : [];
      }),
    [cart, products],
  );
  const itemsNeedingVariant = items.filter(
    ({ product, variant }) =>
      product.variants && !product.variants.options.includes(variant ?? ""),
  );
  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );
  const shipping =
    subtotal >= settings.shippingThreshold ? 0 : settings.shippingFee;
  const carriedSubtotal = Number(searchParams.get("voucherSubtotal"));
  const carriedDiscount = Number(searchParams.get("voucherDiscount"));
  const carriedVoucher =
    requestedVoucher &&
    carriedSubtotal === subtotal &&
    Number.isSafeInteger(carriedDiscount) &&
    carriedDiscount > 0 &&
    carriedDiscount <= subtotal &&
    !voucherDismissed &&
    !voucherError
      ? {
          code: requestedVoucher,
          discount: carriedDiscount,
          subtotal: carriedSubtotal,
        }
      : null;
  const voucher = verifiedVoucher ?? carriedVoucher;
  const discount = voucher?.discount ?? 0;
  const field =
    "mt-2 h-12 w-full rounded-xl border border-line bg-white px-4 outline-none focus:border-cobalt";

  useEffect(() => {
    voucherRequestId.current += 1;
  }, [cartKey]);

  const applyVoucher = useCallback(async (code = voucherCode) => {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) {
      setVoucherError("Vui lòng nhập hoặc chọn mã voucher.");
      return false;
    }
    const requestCartKey = cartKey;
    const requestId = ++voucherRequestId.current;
    const orderItems = items.map(({ product, quantity, variant }) => ({
      product_id: product.id,
      quantity,
      variant: variant ?? null,
    }));
    setVoucherRequest({ id: requestId, cartKey: requestCartKey });
    setVoucherError("");
    try {
      const result = await quoteStoreVoucher(normalizedCode, orderItems);
      if (voucherRequestId.current !== requestId) return false;
      if (!result.success) {
        setVoucherState(null);
        setVoucherError(result.message);
        return false;
      }
      if (result.quote.subtotal !== subtotal) {
        setVoucherState(null);
        setVoucherError(
          "Giá sản phẩm vừa thay đổi. Tải lại trang để kiểm tra voucher mới nhất.",
        );
        return false;
      }
      setVoucherCode(result.quote.code);
      setVoucherState({ cartKey: requestCartKey, quote: result.quote });
      return true;
    } catch (error) {
      console.error("Không thể kiểm tra voucher.", error);
      setVoucherError("Không thể kiểm tra voucher. Vui lòng thử lại.");
      return false;
    } finally {
      if (voucherRequestId.current === requestId) setVoucherRequest(null);
    }
  }, [cartKey, items, subtotal, voucherCode]);

  const chooseDeliveryAddress = (address: DeliveryAddressSuggestion) => {
    setDeliveryAddress({
      street: address.street,
      district: address.district,
      city: address.city,
    });
  };

  useEffect(() => {
    if (!isVnpayReturn || !returnToken) return;
    let active = true;
    void verifyVnpayReturnToken(returnToken).then((result) => {
      if (!active) return;
      if (!result.valid) {
        setPaymentNotice("Kết quả thanh toán không hợp lệ hoặc đã hết hạn.");
        return;
      }
      if (result.status === "paid") {
        clearCart();
        setComplete(result.orderNumber);
        setCompleteMethod("vnpay");
        return;
      }
      setPaymentNotice(
        `Thanh toán cho đơn ${result.orderNumber} chưa thành công. Giỏ hàng vẫn được giữ để bạn thử lại.`,
      );
    }).catch((error: unknown) => {
      if (!active) return;
      console.error("Không thể xác minh kết quả VNPay trả về.", error);
      setPaymentNotice(
        "Chưa thể xác minh kết quả thanh toán. Hãy xem lại trạng thái đơn hàng trước khi thử thanh toán lần nữa.",
      );
    });
    return () => {
      active = false;
    };
  }, [clearCart, isVnpayReturn, returnToken]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setPaymentNotice("");
    if (itemsNeedingVariant.length > 0) {
      setErrorMessage(
        "Vui lòng chọn đầy đủ tùy chọn cho sản phẩm trước khi đặt hàng.",
      );
      return;
    }
    const formData = new FormData(event.currentTarget);
    formData.set("voucher_code", voucher?.code ?? "");
    const orderItems = items.map(({ product, quantity, variant }) => ({
      product_id: product.id,
      quantity,
      variant: variant ?? null,
    }));
    startTransition(async () => {
      let result: Awaited<ReturnType<typeof placeStoreOrder>>;
      try {
        result = await placeStoreOrder(formData, orderItems);
      } catch (error) {
        console.error("Không thể gửi yêu cầu đặt hàng.", error);
        setErrorMessage(
          "Không nhận được xác nhận từ máy chủ. Hãy kiểm tra lịch sử đơn hàng trước khi thử lại.",
        );
        return;
      }
      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }
      if (result.paymentUrl) {
        window.location.assign(result.paymentUrl);
        return;
      }
      clearCart();
      setComplete(result.orderNumber);
      setCompleteMethod(result.paymentMethod);
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
            {completeMethod === "vnpay"
              ? "Thanh toán VNPay đã được xác nhận. Mã đơn hàng của bạn là "
              : "Mã đơn hàng của bạn là "}
            <strong className="text-navy">{complete}</strong>. Chúng tôi sẽ liên
            hệ để xác nhận đơn hàng
            {completeMethod === "cod" && " và thanh toán khi nhận hàng"}.
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
      {visiblePaymentNotice && (
        <p
          role="status"
          className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-navy"
        >
          {visiblePaymentNotice}
        </p>
      )}
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
            <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
              <AddressPicker onSelect={chooseDeliveryAddress} />
              <div className="grid gap-5">
                <label className="text-sm font-semibold text-navy">
                  Địa chỉ
                  <input
                    required
                    minLength={3}
                    maxLength={240}
                    className={field}
                    name="address"
                    autoComplete="street-address"
                    value={deliveryAddress.street}
                    onChange={(event) =>
                      setDeliveryAddress((current) => ({
                        ...current,
                        street: event.target.value,
                      }))
                    }
                  />
                </label>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="text-sm font-semibold text-navy">
                    Quận / Huyện
                    <input
                      required
                      minLength={2}
                      maxLength={120}
                      className={field}
                      name="district"
                      value={deliveryAddress.district}
                      onChange={(event) =>
                        setDeliveryAddress((current) => ({
                          ...current,
                          district: event.target.value,
                        }))
                      }
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
                      value={deliveryAddress.city}
                      onChange={(event) =>
                        setDeliveryAddress((current) => ({
                          ...current,
                          city: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
              </div>
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
          <div className="mt-6 border-t border-line pt-5">
            <label
              htmlFor="voucher-code"
              className="flex items-center gap-2 text-sm font-semibold text-navy"
            >
              <span aria-hidden="true">◇</span>
              Mã giảm giá
            </label>
            <div className="mt-3 flex gap-2">
              <input
                id="voucher-code"
                value={voucherCode}
                maxLength={40}
                disabled={pending || checkingVoucher || Boolean(voucher)}
                onChange={(event) => {
                  setVoucherCode(event.target.value.toUpperCase());
                  setVoucherError("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    if (!voucher && !checkingVoucher) void applyVoucher();
                  }
                }}
                placeholder="Nhập mã voucher"
                className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-white px-3 text-sm uppercase text-navy outline-none focus:border-cobalt"
              />
              {voucher ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setVoucherState(null);
                    setVoucherCode("");
                    setVoucherError("");
                    setVoucherDismissed(true);
                  }}
                  className="h-11 shrink-0 rounded-lg border border-line bg-white px-3 text-sm font-bold text-navy disabled:opacity-50"
                  aria-label="Gỡ voucher"
                >
                  Gỡ
                </button>
              ) : (
                <button
                  type="button"
                  disabled={pending || checkingVoucher || !voucherCode.trim()}
                  onClick={() => void applyVoucher()}
                  className="h-11 shrink-0 rounded-lg bg-navy px-4 text-sm font-bold text-white disabled:opacity-50"
                >
                  {checkingVoucher ? "Đang kiểm tra..." : "Áp dụng"}
                </button>
              )}
            </div>
            {voucherError && (
              <p role="alert" className="mt-2 text-sm text-coral">
                {voucherError}
              </p>
            )}
            {voucher && (
              <p role="status" className="mt-2 text-sm font-semibold text-cobalt">
              Đã áp dụng {voucher.code}
              </p>
            )}
            <div className="mt-3">
              <VoucherPicker
                subtotal={subtotal}
                selectedCode={voucher?.code ?? null}
                disabled={pending || checkingVoucher}
                errorMessage={voucherError}
                onApply={applyVoucher}
              />
            </div>
          </div>
          <dl className="mt-6 space-y-3 border-t border-line pt-5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Vận chuyển</dt>
              <dd>{shipping ? formatPrice(shipping) : "Miễn phí"}</dd>
            </div>
            {voucher && (
              <div className="flex justify-between gap-3 font-semibold text-cobalt">
                <dt>Giảm giá</dt>
                <dd>−{formatPrice(discount)}</dd>
              </div>
            )}
            <div className="flex justify-between font-bold text-navy">
              <dt>Tổng cộng</dt>
              <dd className="text-lg">
                {formatPrice(subtotal + shipping - discount)}
              </dd>
            </div>
          </dl>
          <fieldset className="mt-6 border-t border-line pt-5">
            <legend className="font-semibold text-navy">
              Phương thức thanh toán
            </legend>
            <div className="mt-3 grid gap-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-white p-3 text-sm">
                <input
                  type="radio"
                  name="payment_method"
                  value="cod"
                  defaultChecked
                  className="mt-1 accent-navy"
                />
                <span>
                  <span className="block font-bold text-navy">
                    Thanh toán khi nhận hàng
                  </span>
                  <span className="mt-1 block text-xs text-muted">
                    Trả tiền trực tiếp cho đơn vị giao hàng.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-white p-3 text-sm">
                <input
                  type="radio"
                  name="payment_method"
                  value="vnpay"
                  className="mt-1 accent-navy"
                />
                <span>
                  <span className="block font-bold text-navy">
                    Thanh toán trực tuyến VNPay
                  </span>
                  <span className="mt-1 block text-xs text-muted">
                    Chuyển đến VNPay để thanh toán an toàn.
                  </span>
                </span>
              </label>
            </div>
          </fieldset>
          {(errorMessage || itemsNeedingVariant.length > 0) && (
            <p
              role="alert"
              className="mt-5 rounded-xl border border-coral/40 bg-coral/10 p-3 text-sm text-navy"
            >
              {itemsNeedingVariant.length > 0
                ? "Giỏ hàng có sản phẩm chưa chọn tùy chọn bắt buộc. Hãy xóa món đó khỏi giỏ, mở lại trang sản phẩm và chọn kích cỡ/màu trước khi thêm lại."
                : errorMessage}
              {itemsNeedingVariant.length > 0 && (
                <span className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                  {itemsNeedingVariant.map(({ product }) => (
                    <span key={product.id} className="block">
                      <Link
                        href={`/products/${product.slug}`}
                        className="font-bold underline"
                      >
                        Mở {product.name} để chọn{" "}
                        {product.variants?.label.toLocaleLowerCase("vi-VN")}
                      </Link>
                    </span>
                  ))}
                  <Link href="/cart" className="font-bold underline">
                    Quay lại giỏ hàng để xóa món cũ
                  </Link>
                </span>
              )}
            </p>
          )}
          <button
            disabled={
              pending ||
              checkingVoucher ||
              itemsNeedingVariant.length > 0
            }
            className="mt-6 h-12 w-full rounded-full bg-navy text-sm font-bold text-white hover:bg-cobalt disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending
              ? "Đang xử lý..."
              : checkingVoucher
                ? "Đang xác minh voucher..."
                : "Đặt hàng"}
          </button>
          <p className="mt-4 text-center text-xs leading-5 text-muted">
            Giá và tồn kho được xác minh phía máy chủ khi đặt hàng.
          </p>
        </aside>
      </form>
    </div>
  );
}
