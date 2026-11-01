import "server-only";

import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

export type CustomerProfile = {
  id: string;
  full_name: string;
  phone: string;
};

export type CustomerAddress = {
  id: string;
  label: string;
  recipient_name: string;
  phone: string;
  street: string;
  district: string;
  city: string;
  is_default: boolean;
  created_at: string;
};

export type CustomerOrderItem = {
  product_name: string;
  product_slug: string;
  image: string;
  variant: string | null;
  unit_price: number;
  quantity: number;
};

export type CustomerOrder = {
  id: number;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  address: string;
  district: string;
  city: string;
  status: "pending" | "confirmed" | "shipping" | "completed" | "cancelled";
  subtotal: number;
  shipping_fee: number;
  total: number;
  created_at: string;
  items: CustomerOrderItem[];
};

export type CustomerDataResult<T> =
  | { user: User; data: T; error: null }
  | { user: null; data: null; error: string };

export async function getCustomerProfile(): Promise<
  CustomerDataResult<CustomerProfile>
> {
  if (!getSupabaseConfig()) {
    return {
      user: null,
      data: null,
      error: "Tài khoản chưa được cấu hình.",
    };
  }
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError && authError.name !== "AuthSessionMissingError") {
    console.error("Không thể xác minh tài khoản khách hàng.", authError);
    return { user: null, data: null, error: "Không thể xác minh tài khoản." };
  }
  if (!authData.user) {
    return {
      user: null,
      data: null,
      error: "Vui lòng đăng nhập để quản lý tài khoản.",
    };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (error) {
    console.error("Không thể tải hồ sơ khách hàng.", error);
    return {
      user: null,
      data: null,
      error: "Không thể tải hồ sơ tài khoản.",
    };
  }

  return {
    user: authData.user,
    data: {
      id: authData.user.id,
      full_name:
        data?.full_name ??
        (typeof authData.user.user_metadata.full_name === "string"
          ? authData.user.user_metadata.full_name
          : ""),
      phone: data?.phone ?? "",
    },
    error: null,
  };
}

export async function getCustomerAddresses(): Promise<
  CustomerDataResult<CustomerAddress[]>
> {
  if (!getSupabaseConfig()) {
    return { user: null, data: null, error: "Tài khoản chưa được cấu hình." };
  }
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError && authError.name !== "AuthSessionMissingError") {
    console.error("Không thể xác minh tài khoản khi tải địa chỉ.", authError);
    return { user: null, data: null, error: "Không thể xác minh tài khoản." };
  }
  if (!authData.user) {
    return {
      user: null,
      data: null,
      error: "Vui lòng đăng nhập để quản lý địa chỉ giao hàng.",
    };
  }

  const { data, error } = await supabase
    .from("store_addresses")
    .select("id, label, recipient_name, phone, street, district, city, is_default, created_at")
    .eq("customer_id", authData.user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Không thể tải địa chỉ khách hàng.", error);
    return {
      user: null,
      data: null,
      error: "Không thể tải địa chỉ. Hãy chạy migration Supabase mới nhất.",
    };
  }
  return { user: authData.user, data: data ?? [], error: null };
}

export async function getCustomerOrders(): Promise<
  CustomerDataResult<CustomerOrder[]>
> {
  if (!getSupabaseConfig()) {
    return { user: null, data: null, error: "Tài khoản chưa được cấu hình." };
  }
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError && authError.name !== "AuthSessionMissingError") {
    console.error("Không thể xác minh tài khoản khi tải đơn hàng.", authError);
    return { user: null, data: null, error: "Không thể xác minh tài khoản." };
  }
  if (!authData.user) {
    return {
      user: null,
      data: null,
      error: "Vui lòng đăng nhập để xem đơn hàng.",
    };
  }

  const { data: rows, error } = await supabase
    .from("store_orders")
    .select("id, order_number, customer_name, customer_email, customer_phone, address, district, city, status, subtotal, shipping_fee, total, created_at")
    .eq("customer_id", authData.user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    console.error("Không thể tải đơn hàng khách hàng.", error);
    return {
      user: null,
      data: null,
      error: "Không thể tải đơn hàng. Hãy chạy migration Supabase mới nhất.",
    };
  }

  const orders: CustomerOrder[] = (rows ?? []).map((row) => ({
    ...row,
    order_number: row.order_number ?? `NV-${row.id}`,
    subtotal: Number(row.subtotal),
    shipping_fee: Number(row.shipping_fee),
    total: Number(row.total),
    items: [],
  }));
  if (orders.length) {
    const { data: items, error: itemsError } = await supabase
      .from("store_order_items")
      .select("order_id, product_name, product_slug, image, variant, unit_price, quantity")
      .in(
        "order_id",
        orders.map((order) => order.id),
      );
    if (itemsError) {
      console.error("Không thể tải sản phẩm trong đơn hàng khách.", itemsError);
      return {
        user: null,
        data: null,
        error: "Không thể tải chi tiết sản phẩm trong đơn hàng.",
      };
    }
    for (const order of orders) {
      order.items = (items ?? [])
        .filter((item) => Number(item.order_id) === order.id)
        .map((item) => ({
          product_name: item.product_name,
          product_slug: item.product_slug,
          image: item.image,
          variant: item.variant,
          unit_price: Number(item.unit_price),
          quantity: Number(item.quantity),
        }));
    }
  }
  return { user: authData.user, data: orders, error: null };
}

export async function getCheckoutCustomerDetails() {
  if (!getSupabaseConfig()) return null;
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError && authError.name !== "AuthSessionMissingError") {
    console.error("Không thể xác minh người dùng khi mở thanh toán.", authError);
    return null;
  }
  if (!authData.user) return null;

  const [profileResult, addressResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", authData.user.id)
      .maybeSingle(),
    supabase
      .from("store_addresses")
      .select("recipient_name, phone, street, district, city")
      .eq("customer_id", authData.user.id)
      .eq("is_default", true)
      .maybeSingle(),
  ]);
  if (profileResult.error || addressResult.error) {
    console.error(
      "Không thể tải thông tin điền sẵn cho thanh toán.",
      profileResult.error ?? addressResult.error,
    );
    return {
      email: authData.user.email ?? "",
      name:
        typeof authData.user.user_metadata.full_name === "string"
          ? authData.user.user_metadata.full_name
          : "",
      phone: "",
      address: null,
    };
  }

  return {
    email: authData.user.email ?? "",
    name: profileResult.data?.full_name ?? "",
    phone: profileResult.data?.phone ?? "",
    address: addressResult.data
      ? {
          name: addressResult.data.recipient_name,
          phone: addressResult.data.phone,
          street: addressResult.data.street,
          district: addressResult.data.district,
          city: addressResult.data.city,
        }
      : null,
  };
}
