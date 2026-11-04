"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { saveAdminVoucher } from "@/app/actions/admin-data";
import { formatPrice } from "@/data/products";
import type { AdminVoucher } from "@/lib/vouchers";

const fieldControlClass =
  "h-11 w-full rounded-lg border border-line bg-white px-3 text-sm font-normal text-navy outline-none focus:border-cobalt";
const fieldClass = `mt-2 ${fieldControlClass}`;

function formatInteger(value: string) {
  if (!value) return "";
  return Number(value).toLocaleString("vi-VN", {
    maximumFractionDigits: 0,
  });
}

function FormattedIntegerInput({
  name,
  defaultValue,
  required = false,
  placeholder,
  disabled,
  min,
  max,
}: {
  name: string;
  defaultValue: number | string | null | undefined;
  required?: boolean;
  placeholder?: string;
  disabled: boolean;
  min?: number;
  max?: number;
}) {
  const [value, setValue] = useState(
    defaultValue === null || defaultValue === undefined
      ? ""
      : String(defaultValue),
  );
  const [focused, setFocused] = useState(false);
  const validateRange = (rawValue: string, input: HTMLInputElement) => {
    const numericValue = Number(rawValue);
    const belowMinimum = rawValue !== "" && min !== undefined && numericValue < min;
    const aboveMaximum = rawValue !== "" && max !== undefined && numericValue > max;
    input.setCustomValidity(
      belowMinimum
        ? `Giá trị phải lớn hơn hoặc bằng ${formatInteger(String(min))}.`
        : aboveMaximum
          ? `Giá trị không được vượt quá ${formatInteger(String(max))}.`
          : "",
    );
  };

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <input
        type="text"
        inputMode="numeric"
        required={required}
        value={focused ? value : formatInteger(value)}
        onFocus={() => setFocused(true)}
        onBlur={(event) => {
          setFocused(false);
          validateRange(value, event.currentTarget);
        }}
        onChange={(event) => {
          const nextValue = event.target.value.replace(/\D/g, "");
          validateRange(nextValue, event.currentTarget);
          setValue(nextValue);
        }}
        placeholder={placeholder}
        className={fieldClass}
        disabled={disabled}
      />
    </>
  );
}

function localDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function voucherStatus(voucher: AdminVoucher) {
  if (!voucher.is_active) return "Tạm dừng";
  if (voucher.starts_at && new Date(voucher.starts_at) > new Date()) {
    return "Sắp bắt đầu";
  }
  if (voucher.expires_at && new Date(voucher.expires_at) <= new Date()) {
    return "Hết hạn";
  }
  if (voucher.usage_limit && voucher.used_count >= voucher.usage_limit) {
    return "Hết lượt";
  }
  return "Đang hoạt động";
}

export function VoucherManager({
  vouchers,
  loadError,
}: {
  vouchers: AdminVoucher[];
  loadError?: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<AdminVoucher | null>(null);
  const [open, setOpen] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">(
    "percent",
  );
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{
    message: string;
    success: boolean;
  } | null>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    for (const name of ["startsAt", "expiresAt"]) {
      const value = formData.get(name);
      if (typeof value === "string" && value) {
        const date = new Date(value);
        if (!Number.isFinite(date.getTime())) {
          setNotice({ message: "Thời hạn voucher không hợp lệ.", success: false });
          return;
        }
        formData.set(name, date.toISOString());
      }
    }

    setPending(true);
    setNotice(null);
    void saveAdminVoucher(formData)
      .then((result) => {
        setNotice(result);
        if (result.success) {
          setOpen(false);
          router.refresh();
        }
      })
      .catch((error: unknown) => {
        console.error("Không thể lưu voucher quản trị.", error);
        setNotice({
          message: "Không thể lưu voucher. Vui lòng thử lại.",
          success: false,
        });
      })
      .finally(() => setPending(false));
  };

  const startCreate = () => {
    setEditing(null);
    setVoucherCode("");
    setDiscountType("percent");
    setOpen(true);
    setNotice(null);
  };

  const generateVoucherCode = () => {
    try {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const code = `NOVA-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
        if (!vouchers.some((voucher) => voucher.code === code)) {
          setVoucherCode(code);
          setNotice(null);
          return;
        }
      }
      setNotice({
        message: "Chưa tạo được mã duy nhất. Vui lòng thử lại.",
        success: false,
      });
    } catch (error) {
      console.error("Không thể tạo mã voucher ngẫu nhiên.", error);
      setNotice({
        message: "Không thể tạo mã tự động trên trình duyệt này.",
        success: false,
      });
    }
  };

  return (
    <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-navy">
            Voucher khuyến mãi
          </h2>
          <p className="mt-1 text-sm text-muted">
            Tạo mã để khách nhập hoặc chọn tại trang thanh toán.
          </p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="h-10 rounded-full bg-navy px-5 text-sm font-bold text-white transition hover:bg-cobalt"
        >
          Tạo voucher
        </button>
      </div>

      {loadError && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-coral/30 bg-coral/5 p-3 text-sm text-navy"
        >
          {loadError} Chạy{" "}
          <code>supabase/migrations/20261104000000_store_vouchers.sql</code>{" "}
          trong Supabase SQL Editor cùng các migration trước đó.
        </p>
      )}

      {notice && (
        <p
          role={notice.success ? "status" : "alert"}
          className={`mt-4 rounded-lg p-3 text-sm ${
            notice.success
              ? "bg-[#eaf7f2] text-[#18795e]"
              : "bg-coral/10 text-navy"
          }`}
        >
          {notice.message}
        </p>
      )}

      {open && (
        <form
          key={editing?.id ?? "new-voucher"}
          onSubmit={submit}
          className="mt-6 border-y border-line py-6"
        >
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-semibold text-navy">
              {editing ? `Sửa voucher ${editing.code}` : "Voucher mới"}
            </h3>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setNotice(null);
              }}
              className="text-sm font-bold text-muted hover:text-navy"
            >
              Đóng
            </button>
          </div>
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="text-sm font-semibold text-navy">
              <label htmlFor="admin-voucher-code">Mã voucher</label>
              <div className="mt-2 flex gap-2">
                <input
                  id="admin-voucher-code"
                  name="code"
                  required
                  pattern="[A-Za-z0-9_\-]{3,40}"
                  maxLength={40}
                  value={voucherCode}
                  onChange={(event) =>
                    setVoucherCode(event.target.value.toUpperCase())
                  }
                  className={`${fieldControlClass} min-w-0 flex-1 uppercase`}
                  disabled={pending}
                />
                {!editing && (
                  <button
                    type="button"
                    onClick={generateVoucherCode}
                    disabled={pending}
                    className="mt-0 h-11 shrink-0 rounded-lg border border-cobalt/25 bg-cobalt/[.06] px-3 text-xs font-bold text-cobalt transition hover:bg-cobalt/10 disabled:opacity-50 sm:px-4"
                  >
                    Tạo ngẫu nhiên
                  </button>
                )}
              </div>
            </div>
            <label className="text-sm font-semibold text-navy">
              Loại giảm
              <select
                name="discountType"
                value={discountType}
                onChange={(event) =>
                  setDiscountType(
                    event.target.value === "fixed" ? "fixed" : "percent",
                  )
                }
                className={fieldClass}
                disabled={pending}
              >
                <option value="percent">Phần trăm (%)</option>
                <option value="fixed">Số tiền (đ)</option>
              </select>
            </label>
            <label className="text-sm font-semibold text-navy">
              Giá trị giảm ({discountType === "percent" ? "%" : "đ"})
              {discountType === "percent" ? (
                <input
                  name="discountValue"
                  type="number"
                  required
                  min={1}
                  max={100}
                  defaultValue={editing?.discount_value}
                  className={fieldClass}
                  disabled={pending}
                />
              ) : (
                <FormattedIntegerInput
                  key={discountType}
                  name="discountValue"
                  required
                  defaultValue={editing?.discount_value}
                  disabled={pending}
                  min={1}
                  max={2147483647}
                />
              )}
            </label>
            <label className="text-sm font-semibold text-navy">
              Đơn tối thiểu (đ)
              <FormattedIntegerInput
                name="minSubtotal"
                required
                defaultValue={editing?.min_subtotal ?? 0}
                disabled={pending}
                min={0}
                max={2147483647}
              />
            </label>
            <label className="text-sm font-semibold text-navy">
              Giảm tối đa (đ)
              <FormattedIntegerInput
                name="maxDiscount"
                placeholder="Không giới hạn"
                defaultValue={editing?.max_discount ?? ""}
                disabled={pending}
                min={1}
                max={2147483647}
              />
            </label>
            <label className="text-sm font-semibold text-navy">
              Tổng lượt sử dụng
              <input
                name="usageLimit"
                type="number"
                min={1}
                placeholder="Không giới hạn"
                defaultValue={editing?.usage_limit ?? ""}
                className={fieldClass}
                disabled={pending}
              />
            </label>
            <label className="text-sm font-semibold text-navy">
              Bắt đầu
              <input
                name="startsAt"
                type="datetime-local"
                defaultValue={localDate(editing?.starts_at ?? null)}
                className={fieldClass}
                disabled={pending}
              />
            </label>
            <label className="text-sm font-semibold text-navy">
              Kết thúc
              <input
                name="expiresAt"
                type="datetime-local"
                defaultValue={localDate(editing?.expires_at ?? null)}
                className={fieldClass}
                disabled={pending}
              />
            </label>
          </div>
          <label className="my-5 flex items-center gap-2 text-sm text-navy">
            <input
              name="isActive"
              type="checkbox"
              defaultChecked={editing?.is_active ?? true}
              disabled={pending}
            />
            Đang hoạt động
          </label>
          <button
            disabled={pending}
            className="h-10 rounded-full bg-cobalt px-5 text-sm font-bold text-white disabled:opacity-50"
          >
            {pending ? "Đang lưu..." : "Lưu voucher"}
          </button>
        </form>
      )}

      {vouchers.length === 0 ? (
        <p className="mt-6 border-t border-line py-6 text-sm text-muted">
          Chưa có voucher nào.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b border-line text-[10px] font-extrabold uppercase tracking-[.13em] text-muted">
              <tr>
                <th className="py-3">Mã</th>
                <th>Ưu đãi</th>
                <th>Lượt sử dụng</th>
                <th>Trạng thái / hạn dùng</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {vouchers.map((voucher) => (
                <tr key={voucher.id}>
                  <td className="py-4 font-bold text-navy">{voucher.code}</td>
                  <td className="py-4 text-navy">
                    {voucher.discount_type === "percent"
                      ? `${voucher.discount_value}%`
                      : formatPrice(voucher.discount_value)}
                    <span className="mt-1 block text-xs text-muted">
                      Đơn từ {formatPrice(voucher.min_subtotal)}
                      {voucher.max_discount
                        ? ` · Tối đa ${formatPrice(voucher.max_discount)}`
                        : ""}
                    </span>
                  </td>
                  <td>
                    {voucher.used_count} / {voucher.usage_limit ?? "∞"}
                  </td>
                  <td className="text-muted">
                    {voucherStatus(voucher)}
                    {voucher.expires_at && (
                      <span className="mt-1 block text-xs">
                        {new Date(voucher.expires_at).toLocaleString("vi-VN")}
                      </span>
                    )}
                  </td>
                  <td className="text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(voucher);
                        setVoucherCode(voucher.code);
                        setDiscountType(voucher.discount_type);
                        setOpen(true);
                        setNotice(null);
                      }}
                      className="font-bold text-cobalt hover:underline"
                    >
                      Sửa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
