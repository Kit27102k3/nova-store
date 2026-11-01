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
  "mt-2 h-11 w-full rounded-xl border border-line bg-white px-3 text-sm font-normal text-navy outline-none focus:border-cobalt";

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
    <div className="mt-8">
      {notice && (
        <p
          role="status"
          className="mb-5 rounded-xl border border-coral/30 bg-coral/10 p-4 text-sm leading-6 text-navy"
        >
          {notice}
        </p>
      )}
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
          disabled={!storageReady}
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
          <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
            <AddressPicker
              key={editing?.id ?? "new-address"}
              onSelect={chooseDeliveryAddress}
            />
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
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              disabled={pending}
              className="h-11 rounded-full bg-navy px-6 text-sm font-bold text-white hover:bg-cobalt disabled:opacity-50"
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
              className="h-11 rounded-full border border-line px-6 text-sm font-bold text-navy"
            >
              Hủy
            </button>
          </div>
        </form>
      )}

      {!storageReady ? (
        <div
          aria-label="Đang tải địa chỉ đã lưu"
          className="h-48 animate-pulse rounded-[28px] bg-mist"
        />
      ) : addresses.length === 0 && !open ? (
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
