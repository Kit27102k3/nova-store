"use client";

import { useEffect, useRef, useState } from "react";
import { listAvailableStoreVouchers } from "@/app/actions/vouchers";
import { formatPrice } from "@/data/products";
import type { AvailableVoucher } from "@/lib/vouchers";
import { Icon } from "@/components/ui/Icon";

type VoucherPickerProps = {
  subtotal: number;
  selectedCode: string | null;
  disabled?: boolean;
  errorMessage?: string;
  onApply: (code: string) => Promise<boolean>;
};

export function VoucherPicker({
  subtotal,
  selectedCode,
  disabled = false,
  errorMessage = "",
  onApply,
}: VoucherPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [vouchers, setVouchers] = useState<AvailableVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [applyingCode, setApplyingCode] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let active = true;
    void listAvailableStoreVouchers()
      .then((result) => {
        if (!active) return;
        if (result.success) {
          setVouchers(result.vouchers);
        } else {
          setListError(result.message);
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        console.error("Không thể tải voucher.", error);
        setListError("Không thể tải danh sách ưu đãi. Vui lòng thử lại.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  const apply = async (code: string) => {
    setApplyingCode(code);
    try {
      if (await onApply(code)) setIsOpen(false);
    } finally {
      setApplyingCode("");
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(true)}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cobalt/25 bg-cobalt/[.06] px-4 text-sm font-bold text-cobalt transition hover:bg-cobalt/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Icon name="ticket" className="size-4" />
        Chọn hoặc xem mã ưu đãi
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby="voucher-picker-title"
        style={{ display: isOpen ? "flex" : "none" }}
        onClose={() => setIsOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setIsOpen(false);
        }}
        className="fixed inset-0 m-0 flex h-dvh w-screen max-h-none max-w-none items-end justify-center bg-transparent p-0 backdrop:bg-navy/60 sm:items-center"
      >
        <section className="flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]">
            <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-5 sm:px-7">
              <div>
                <p className="section-kicker">Ưu đãi dành cho bạn</p>
                <h2
                  id="voucher-picker-title"
                  className="font-display text-2xl text-navy sm:text-3xl"
                >
                  Chọn mã giảm giá
                </h2>
                <p className="mt-2 text-sm text-muted">
                  Giá trị giỏ hàng hiện tại:{" "}
                  <strong className="text-navy">{formatPrice(subtotal)}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="grid size-10 shrink-0 place-items-center rounded-full bg-mist text-navy transition hover:bg-line"
                aria-label="Đóng danh sách voucher"
              >
                <Icon name="close" className="size-4" />
              </button>
            </header>
            <div className="overflow-y-auto p-4 sm:p-6">
              {loading && (
                <p role="status" className="py-8 text-center text-sm text-muted">
                  Đang tải ưu đãi...
                </p>
              )}
              {listError && (
                <p
                  role="alert"
                  className="rounded-xl border border-coral/30 bg-coral/5 p-4 text-sm text-coral"
                >
                  {listError}
                </p>
              )}
              {!loading && !listError && vouchers.length === 0 && (
                <p className="py-8 text-center text-sm text-muted">
                  Hiện chưa có mã ưu đãi khả dụng.
                </p>
              )}
              <div className="grid gap-3">
                {vouchers.map((voucher) => {
                  const eligible = subtotal >= voucher.min_subtotal;
                  const isSelected =
                    selectedCode?.toUpperCase() === voucher.code.toUpperCase();
                  const expiration = voucher.expires_at
                    ? new Date(voucher.expires_at)
                    : null;
                  const expirationLabel =
                    expiration && !Number.isNaN(expiration.getTime())
                      ? expiration.toLocaleDateString("vi-VN")
                      : null;

                  return (
                    <article
                      key={voucher.code}
                      className={`relative grid overflow-hidden rounded-2xl border ${
                        isSelected
                          ? "border-cobalt bg-cobalt/[.04]"
                          : "border-line bg-white"
                      } sm:grid-cols-[1fr_auto]`}
                    >
                      <div className="relative flex min-w-0 items-center gap-4 p-4 sm:p-5">
                        <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-coral to-cobalt text-white shadow-[0_8px_22px_rgba(49,92,255,.2)]">
                          <Icon name="ticket" className="size-7" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold tracking-wide text-navy">
                            {voucher.code}
                          </p>
                          <p className="mt-1 text-sm font-bold text-cobalt">
                            {voucher.discount_type === "percent"
                              ? `Giảm ${voucher.discount_value}%`
                              : `Giảm ${formatPrice(voucher.discount_value)}`}
                          </p>
                          <p className="mt-2 text-xs leading-5 text-muted">
                            Đơn tối thiểu{" "}
                            <strong className="text-navy">
                              {formatPrice(voucher.min_subtotal)}
                            </strong>
                            {voucher.max_discount
                              ? ` · Giảm tối đa ${formatPrice(voucher.max_discount)}`
                              : ""}
                            {expirationLabel
                              ? ` · Hạn ${expirationLabel}`
                              : ""}
                          </p>
                          {!eligible && (
                            <p className="mt-1 text-xs font-semibold text-coral">
                              Mua thêm{" "}
                              {formatPrice(voucher.min_subtotal - subtotal)} để
                              áp dụng mã này
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 border-t border-dashed border-line px-4 py-3 sm:flex-col sm:justify-center sm:border-l sm:border-t-0 sm:px-5">
                        <span className="text-[10px] font-bold uppercase tracking-[.14em] text-muted sm:hidden">
                          Voucher Nova
                        </span>
                        <button
                          type="button"
                          disabled={
                            !eligible ||
                            disabled ||
                            Boolean(applyingCode) ||
                            isSelected
                          }
                          onClick={() => void apply(voucher.code)}
                          className={`h-10 min-w-28 rounded-full px-4 text-xs font-bold transition ${
                            isSelected
                              ? "bg-lime text-navy"
                              : "bg-cobalt text-white hover:bg-navy"
                          } disabled:cursor-not-allowed disabled:opacity-45`}
                        >
                          {applyingCode === voucher.code
                            ? "Đang áp dụng..."
                            : isSelected
                              ? "Đã áp dụng"
                              : "Áp dụng"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
              {errorMessage && (
                <p
                  role="alert"
                  className="mt-4 rounded-xl border border-coral/30 bg-coral/5 p-3 text-sm text-coral"
                >
                  {errorMessage}
                </p>
              )}
            </div>
        </section>
      </dialog>
    </>
  );
}
