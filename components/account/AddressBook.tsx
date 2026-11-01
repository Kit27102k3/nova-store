"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import {
  deleteCustomerAddress,
  saveCustomerAddress,
  type CustomerActionResult,
} from "@/app/actions/customer";
import type { CustomerAddress } from "@/lib/supabase/customer";
import { Icon } from "@/components/ui/Icon";

const fieldClass =
  "mt-2 h-11 w-full rounded-xl border border-line bg-white px-3 text-sm font-normal text-navy outline-none focus:border-cobalt";

export function AddressBook({ addresses }: { addresses: CustomerAddress[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<CustomerAddress | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<CustomerActionResult | null>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await saveCustomerAddress(formData);
      setMessage(result);
      if (result.success) {
        setEditing(null);
        setOpen(false);
        router.refresh();
      }
    });
  };

  const remove = (address: CustomerAddress) => {
    if (!window.confirm(`Xóa địa chỉ “${address.label}”?`)) return;
    const formData = new FormData();
    formData.set("id", address.id);
    startTransition(async () => {
      const result = await deleteCustomerAddress(formData);
      setMessage(result);
      if (result.success) router.refresh();
    });
  };

  const edit = (address: CustomerAddress | null) => {
    setEditing(address);
    setOpen(true);
    setMessage(null);
  };

  return (
    <div className="mt-8">
      {message && (
        <p
          role={message.success ? "status" : "alert"}
          className={`mb-5 rounded-xl border p-4 text-sm ${
            message.success
              ? "border-[#18795e]/20 bg-[#eaf7f2] text-[#18795e]"
              : "border-coral/40 bg-coral/10 text-navy"
          }`}
        >
          {message.message}
        </p>
      )}
      {!open && (
        <button
          type="button"
          onClick={() => edit(null)}
          className="mb-5 inline-flex h-11 items-center gap-2 rounded-full bg-navy px-5 text-sm font-bold text-white transition hover:bg-cobalt"
        >
          <Icon name="plus" className="size-4" />
          Thêm địa chỉ mới
        </button>
      )}

      {open && (
        <form
          key={editing?.id ?? "new-address"}
          onSubmit={submit}
          className="mb-6 rounded-[28px] border border-line bg-white p-6 shadow-soft sm:p-8"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="section-kicker">Sổ địa chỉ</p>
              <h2 className="font-display text-2xl text-navy">
                {editing ? "Chỉnh sửa địa chỉ" : "Thêm địa chỉ nhận hàng"}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setEditing(null);
              }}
              aria-label="Đóng biểu mẫu"
              className="grid size-9 place-items-center rounded-full border border-line text-muted hover:text-navy"
            >
              ×
            </button>
          </div>
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-navy">
              Tên gợi nhớ
              <input
                name="label"
                required
                maxLength={60}
                defaultValue={editing?.label ?? "Nhà riêng"}
                className={fieldClass}
                disabled={pending}
              />
            </label>
            <label className="text-sm font-semibold text-navy">
              Người nhận
              <input
                name="name"
                required
                minLength={2}
                maxLength={120}
                autoComplete="name"
                defaultValue={editing?.recipient_name ?? ""}
                className={fieldClass}
                disabled={pending}
              />
            </label>
            <label className="text-sm font-semibold text-navy">
              Số điện thoại
              <input
                name="phone"
                required
                minLength={6}
                maxLength={32}
                type="tel"
                autoComplete="tel"
                defaultValue={editing?.phone ?? ""}
                className={fieldClass}
                disabled={pending}
              />
            </label>
            <label className="text-sm font-semibold text-navy sm:col-span-2">
              Địa chỉ
              <input
                name="street"
                required
                minLength={3}
                maxLength={240}
                autoComplete="street-address"
                defaultValue={editing?.street ?? ""}
                className={fieldClass}
                disabled={pending}
              />
            </label>
            <label className="text-sm font-semibold text-navy">
              Quận / Huyện
              <input
                name="district"
                required
                minLength={2}
                maxLength={120}
                defaultValue={editing?.district ?? ""}
                className={fieldClass}
                disabled={pending}
              />
            </label>
            <label className="text-sm font-semibold text-navy">
              Tỉnh / Thành phố
              <input
                name="city"
                required
                minLength={2}
                maxLength={120}
                autoComplete="address-level1"
                defaultValue={editing?.city ?? ""}
                className={fieldClass}
                disabled={pending}
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-navy sm:col-span-2">
              <input
                type="checkbox"
                name="isDefault"
                defaultChecked={editing?.is_default ?? addresses.length === 0}
                disabled={pending}
              />
              Đặt làm địa chỉ mặc định
            </label>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              disabled={pending}
              className="h-11 rounded-full bg-navy px-6 text-sm font-bold text-white hover:bg-cobalt disabled:opacity-50"
            >
              {pending ? "Đang lưu..." : editing ? "Lưu địa chỉ" : "Thêm địa chỉ"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setEditing(null);
              }}
              className="h-11 rounded-full border border-line px-6 text-sm font-bold text-navy"
            >
              Hủy
            </button>
          </div>
        </form>
      )}

      {addresses.length === 0 && !open ? (
        <section className="rounded-[28px] border border-dashed border-line bg-white px-6 py-12 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-mist text-cobalt">
            <Icon name="truck" className="size-6" />
          </div>
          <h2 className="mt-5 font-display text-2xl text-navy">
            Chưa có địa chỉ giao hàng
          </h2>
          <p className="mt-2 text-sm text-muted">
            Thêm địa chỉ để điền nhanh thông tin khi thanh toán.
          </p>
        </section>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {addresses.map((address) => (
            <article
              key={address.id}
              className="rounded-[28px] border border-line bg-white p-6 shadow-soft"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="grid size-11 place-items-center rounded-2xl bg-coral/10 text-coral">
                  <Icon name="user" className="size-5" />
                </div>
                {address.is_default && (
                  <span className="rounded-full bg-lime/60 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-navy">
                    Mặc định
                  </span>
                )}
              </div>
              <h2 className="mt-5 font-display text-2xl text-navy">
                {address.label}
              </h2>
              <div className="mt-3 rounded-2xl bg-mist/80 p-4 text-sm leading-6 text-muted">
                <p className="font-bold text-navy">{address.recipient_name}</p>
                <p>{address.phone}</p>
                <p className="mt-2">
                  {address.street}, {address.district}, {address.city}
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-4 border-t border-line pt-4">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => edit(address)}
                  className="text-sm font-bold text-cobalt hover:underline"
                >
                  Chỉnh sửa
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => remove(address)}
                  className="text-sm font-bold text-coral hover:underline"
                >
                  Xóa
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
