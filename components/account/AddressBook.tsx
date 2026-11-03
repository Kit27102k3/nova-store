"use client";

import { useRouter } from "next/navigation";
import {
  startTransition as startReactTransition,
  useEffect,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import {
  deleteCustomerAddress,
  saveCustomerAddress,
  type CustomerActionResult,
} from "@/app/actions/customer";
import { AddressPicker } from "@/components/address/AddressPicker";
import type { DeliveryAddressSuggestion } from "@/lib/geocoding/types";
import type { CustomerAddress } from "@/lib/supabase/customer";
import { Icon } from "@/components/ui/Icon";

const fieldClass =
  "mt-2 h-11 w-full rounded-xl border border-line bg-white px-3 text-sm font-normal text-navy outline-none transition focus:border-cobalt focus:ring-4 focus:ring-cobalt/10";

function isCustomerAddress(value: unknown): value is CustomerAddress {
  if (!value || typeof value !== "object") return false;
  const address = value as Record<string, unknown>;
  return (
    typeof address.id === "string" &&
    typeof address.label === "string" &&
    typeof address.recipient_name === "string" &&
    typeof address.phone === "string" &&
    typeof address.street === "string" &&
    typeof address.district === "string" &&
    typeof address.city === "string" &&
    typeof address.is_default === "boolean" &&
    typeof address.created_at === "string"
  );
}

export function AddressBook({
  addresses: initialAddresses,
  customerId,
  mode,
  notice,
}: {
  addresses: CustomerAddress[];
  customerId: string;
  mode: "database" | "local";
  notice: string | null;
}) {
  const router = useRouter();
  const [addresses, setAddresses] = useState(initialAddresses);
  const [editing, setEditing] = useState<CustomerAddress | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<CustomerActionResult | null>(null);
  const [storageReady, setStorageReady] = useState(mode !== "local");
  const [deliveryAddress, setDeliveryAddress] = useState({
    street: "",
    district: "",
    city: "",
  });
  const storageKey = `nova-store-addresses:${customerId}`;

  useEffect(() => {
    if (mode !== "local") return;
    try {
      const saved = localStorage.getItem(storageKey);
      const parsed: unknown = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(parsed) || !parsed.every(isCustomerAddress)) {
        console.error("Sổ địa chỉ lưu trên thiết bị không hợp lệ.");
        startReactTransition(() => {
          setMessage({
            success: false,
            message: "Dữ liệu địa chỉ trên thiết bị không hợp lệ.",
          });
          setStorageReady(true);
        });
        return;
      }
      startReactTransition(() => {
        setAddresses(parsed);
        setStorageReady(true);
      });
    } catch (error) {
      console.error("Không thể đọc sổ địa chỉ trên thiết bị.", error);
      startReactTransition(() => {
        setMessage({
          success: false,
          message: "Không thể đọc địa chỉ đã lưu trên thiết bị.",
        });
        setStorageReady(true);
      });
    }
  }, [mode, storageKey]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (mode === "local") {
      const value = (name: string) => {
        const field = formData.get(name);
        return typeof field === "string" ? field.trim() : "";
      };
      const isDefault =
        value("isDefault") === "on" || (!editing && addresses.length === 0);
      const savedAddress: CustomerAddress = {
        id: editing?.id ?? crypto.randomUUID(),
        label: value("label"),
        recipient_name: value("name"),
        phone: value("phone"),
        street: value("street"),
        district: value("district"),
        city: value("city"),
        is_default: isDefault,
        created_at: editing?.created_at ?? new Date().toISOString(),
      };
      const nextAddresses = editing
        ? addresses.map((address) =>
            address.id === editing.id
              ? savedAddress
              : isDefault
                ? { ...address, is_default: false }
                : address,
          )
        : [
            ...addresses.map((address) =>
              isDefault ? { ...address, is_default: false } : address,
            ),
            savedAddress,
          ];
      try {
        localStorage.setItem(storageKey, JSON.stringify(nextAddresses));
        setAddresses(nextAddresses);
        setMessage({
          success: true,
          message: editing ? "Đã cập nhật địa chỉ trên thiết bị." : "Đã thêm địa chỉ trên thiết bị.",
        });
        setEditing(null);
        setOpen(false);
      } catch (error) {
        console.error("Không thể lưu địa chỉ trên thiết bị.", error);
        setMessage({
          success: false,
          message: "Không thể lưu địa chỉ. Hãy kiểm tra dung lượng trình duyệt.",
        });
      }
      return;
    }

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
    if (mode === "local") {
      const remaining = addresses.filter((item) => item.id !== address.id);
      if (address.is_default && remaining.length > 0) {
        remaining[0] = { ...remaining[0], is_default: true };
      }
      try {
        localStorage.setItem(storageKey, JSON.stringify(remaining));
        setAddresses(remaining);
        setMessage({ success: true, message: "Đã xóa địa chỉ trên thiết bị." });
      } catch (error) {
        console.error("Không thể xóa địa chỉ trên thiết bị.", error);
        setMessage({
          success: false,
          message: "Không thể cập nhật sổ địa chỉ trên thiết bị.",
        });
      }
      return;
    }

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
    setDeliveryAddress({
      street: address?.street ?? "",
      district: address?.district ?? "",
      city: address?.city ?? "",
    });
    setOpen(true);
    setMessage(null);
  };

  const chooseDeliveryAddress = (address: DeliveryAddressSuggestion) => {
    setDeliveryAddress({
      street: address.street,
      district: address.district,
      city: address.city,
    });
  };

  return (
    <div className="mt-5">
      {notice && (
        <p
          role="status"
          className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"
        >
          {notice}
        </p>
      )}
      {message && (
        <p
          role={message.success ? "status" : "alert"}
          className={`mb-4 rounded-xl border p-4 text-sm ${
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
          disabled={!storageReady}
          className="mb-4 inline-flex h-11 items-center gap-2 rounded-full bg-navy px-5 text-sm font-extrabold text-white shadow-[0_8px_24px_-12px_rgba(49,92,255,0.8)] transition hover:bg-cobalt disabled:opacity-50"
        >
          <Icon name="plus" className="size-4" />
          Thêm địa chỉ mới
        </button>
      )}

      {open && (
        <form
          key={editing?.id ?? "new-address"}
          onSubmit={submit}
          className="mb-5 rounded-2xl border border-[#dfe2f1] bg-white p-5 shadow-[0_18px_45px_-30px_rgba(49,92,255,0.4)] sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-cobalt">Sổ địa chỉ</p>
              <h2 className="mt-1 font-sans text-xl font-extrabold text-navy">
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
              className="grid size-9 place-items-center rounded-full border border-line bg-white text-lg text-muted transition hover:border-coral hover:bg-coral hover:text-white"
            >
              ×
            </button>
          </div>
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
            <div className="overflow-hidden rounded-xl border border-[#e5e7f2] bg-[#f7f8ff] p-3 sm:p-4">
              <AddressPicker
                key={editing?.id ?? "new-address"}
                onSelect={chooseDeliveryAddress}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
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
              <label className="text-sm font-semibold text-navy sm:col-span-2">
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
                  value={deliveryAddress.street}
                  onChange={(event) =>
                    setDeliveryAddress((current) => ({
                      ...current,
                      street: event.target.value,
                    }))
                  }
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
                  value={deliveryAddress.district}
                  onChange={(event) =>
                    setDeliveryAddress((current) => ({
                      ...current,
                      district: event.target.value,
                    }))
                  }
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
                  value={deliveryAddress.city}
                  onChange={(event) =>
                    setDeliveryAddress((current) => ({
                      ...current,
                      city: event.target.value,
                    }))
                  }
                  className={fieldClass}
                  disabled={pending}
                />
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-[#e4e6f3] bg-gradient-to-r from-[#f3f4ff] to-[#f8fff0] px-4 py-3 text-sm font-bold text-navy sm:col-span-2">
                <input
                  type="checkbox"
                  name="isDefault"
                  defaultChecked={editing?.is_default ?? addresses.length === 0}
                  disabled={pending}
                  className="size-4 accent-cobalt"
                />
                Đặt làm địa chỉ mặc định
              </label>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              disabled={pending}
              className="h-11 rounded-full bg-cobalt px-6 text-sm font-extrabold text-white shadow-sm transition hover:bg-navy disabled:opacity-50"
            >
              {pending
                ? "Đang lưu..."
                : editing
                  ? "Lưu địa chỉ"
                  : "Thêm địa chỉ"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setEditing(null);
              }}
              className="h-11 rounded-full border border-line px-6 text-sm font-bold text-navy transition hover:bg-mist"
            >
              Hủy
            </button>
          </div>
        </form>
      )}

      {!storageReady ? (
        <div
          aria-label="Đang tải địa chỉ đã lưu"
          className="h-40 animate-pulse rounded-2xl bg-mist"
        />
      ) : addresses.length === 0 && !open ? (
        <section className="rounded-2xl border border-dashed border-[#cfd4ef] bg-gradient-to-br from-white to-[#f3f4ff] px-6 py-9 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[linear-gradient(140deg,#315cff,#6d5dfc)] text-white shadow-lg shadow-cobalt/20">
            <Icon name="truck" className="size-6" />
          </div>
          <h2 className="mt-4 font-sans text-xl font-extrabold text-navy">
            Chưa có địa chỉ giao hàng
          </h2>
          <p className="mt-2 text-sm text-muted">
            Thêm địa chỉ để điền nhanh thông tin khi thanh toán.
          </p>
        </section>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {addresses.map((address) => (
            <article
              key={address.id}
              className={`overflow-hidden rounded-xl border bg-white shadow-[0_14px_36px_-28px_rgba(17,24,39,0.45)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-26px_rgba(49,92,255,0.35)] ${
                address.is_default
                  ? "border-cobalt/40 ring-1 ring-cobalt/10"
                  : "border-[#e5e7f0]"
              }`}
            >
              <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-[#f1f3ff] via-white to-[#fff3ee] px-4 py-3">
                <div className="grid size-9 place-items-center rounded-lg bg-coral text-white shadow-sm shadow-coral/25">
                  <Icon name="user" className="size-4" />
                </div>
                {address.is_default && (
                  <span className="rounded-full bg-[#dfff00] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-navy shadow-sm">
                    Mặc định
                  </span>
                )}
              </div>
              <div className="p-4">
                <h2 className="font-sans text-base font-extrabold text-navy">
                  {address.label}
                </h2>
                <div className="mt-2.5 min-h-28 rounded-lg border border-[#e7e9f2] bg-[#fafbff] p-3 text-xs leading-5 text-muted">
                  <p className="font-bold text-navy">{address.recipient_name}</p>
                  <p>{address.phone}</p>
                  <p className="mt-2 break-words text-navy/80">
                    {address.street}, {address.district}, {address.city}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => edit(address)}
                    className="h-8 rounded-lg border border-cobalt/25 px-3 text-[11px] font-extrabold text-cobalt transition hover:bg-cobalt hover:text-white disabled:opacity-50"
                  >
                    Chỉnh sửa
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => remove(address)}
                    className="h-8 rounded-lg border border-coral/25 px-3 text-[11px] font-extrabold text-coral transition hover:bg-coral hover:text-white disabled:opacity-50"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
