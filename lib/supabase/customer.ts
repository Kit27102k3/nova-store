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

export type CustomerOrderEvent = {
  id: number;
  event_type: "order" | "status" | "tracking" | "shipping" | "payment";
  title: string;
  description: string;
  source: "system" | "admin" | "ghn";
  created_at: string;
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
  payment_method: "cod" | "vnpay";
  payment_status: "unpaid" | "pending" | "paid" | "failed" | "cancelled";
  subtotal: number;
  shipping_fee: number;
  voucher_code: string | null;
  discount_amount: number;
  total: number;
  created_at: string;
  ghn_order_code: string | null;
  shipping_status: string | null;
  shipping_status_label: string | null;
  shipping_tracking_url: string | null;
  events: CustomerOrderEvent[];
  items: CustomerOrderItem[];
};

export type CustomerDataResult<T> =
  | { user: User; data: T; error: null; notice?: string }
  | { user: null; data: null; error: string };

export type CustomerAddressesResult =
  | {
      user: User;
      data: CustomerAddress[];
      mode: "database" | "local";
      notice: string | null;
      error: null;
    }
  | { user: null; data: null; mode: null; notice: null; error: string };

function isMissingOrderTrackingMigration(error: { code?: string }) {
  return ["42P01", "42703", "PGRST204", "PGRST205"].includes(error.code ?? "");
}

function appendNotice(current: string | undefined, message: string) {
  return current ? `${current} ${message}` : message;
}

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
  CustomerAddressesResult
> {
  if (!getSupabaseConfig()) {
    return {
      user: null,
      data: null,
      mode: null,
      notice: null,
      error: "Tài khoản chưa được cấu hình.",
    };
  }
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError && authError.name !== "AuthSessionMissingError") {
    console.error("Không thể xác minh tài khoản khi tải địa chỉ.", authError);
    return {
      user: null,
      data: null,
      mode: null,
      notice: null,
      error: "Không thể xác minh tài khoản.",
    };
  }
  if (!authData.user) {
    return {
      user: null,
      data: null,
      mode: null,
      notice: null,
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
    if (error.code === "42P01" || error.code === "PGRST205") {
      return {
        user: authData.user,
        data: [],
        mode: "local",
        notice:
          "Cơ sở dữ liệu địa chỉ chưa được bật. Địa chỉ hiện được lưu trên thiết bị này; chạy migration 20261102000000_customer_features.sql để đồng bộ lên tài khoản.",
        error: null,
      };
    }
    return {
      user: null,
      data: null,
      mode: null,
      notice: null,
      error: "Không thể tải địa chỉ. Hãy chạy migration Supabase mới nhất.",
    };
  }
  return {
    user: authData.user,
    data: data ?? [],
    mode: "database",
    notice: null,
    error: null,
  };
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
    .select("id, order_number, customer_name, customer_email, customer_phone, address, district, city, status, subtotal, shipping_fee, voucher_code, discount_amount, total, created_at")
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
    voucher_code: row.voucher_code ?? null,
    discount_amount: Number(row.discount_amount ?? 0),
    total: Number(row.total),
    payment_method: "cod",
    payment_status: "unpaid",
    ghn_order_code: null,
    shipping_status: null,
    shipping_status_label: null,
    shipping_tracking_url: null,
    events: [],
    items: [],
  }));
  let notice: string | undefined;
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

    const { data: paymentRows, error: paymentError } = await supabase
      .from("store_orders")
      .select("id, payment_method, payment_status")
      .in(
        "id",
        orders.map((order) => order.id),
      );
    if (paymentError) {
      if (isMissingOrderTrackingMigration(paymentError)) {
        console.warn(
          "Thanh toán VNPay chưa được bật. Chạy migration 20261103010000_vnpay_payments.sql trong Supabase.",
        );
        notice = appendNotice(
          notice,
          "Thông tin thanh toán trực tuyến chưa sẵn sàng. Chạy migration 20261103010000_vnpay_payments.sql trong Supabase để bật tính năng này.",
        );
      } else {
        console.error("Không thể tải trạng thái thanh toán đơn hàng.", paymentError);
        notice = appendNotice(notice, "Trạng thái thanh toán tạm thời chưa tải được.");
      }
    } else {
      for (const order of orders) {
        const payment = paymentRows.find(
          (row) => Number(row.id) === order.id,
        );
        if (!payment) continue;
        order.payment_method =
          payment.payment_method === "vnpay" ? "vnpay" : "cod";
        if (
          ["unpaid", "pending", "paid", "failed", "cancelled"].includes(
            payment.payment_status,
          )
        ) {
          order.payment_status = payment.payment_status;
        }
      }
    }

    const { data: trackingRows, error: trackingError } = await supabase
      .from("store_orders")
      .select("id, ghn_order_code, shipping_status, shipping_status_label, shipping_tracking_url")
      .in(
        "id",
        orders.map((order) => order.id),
      );
    if (trackingError) {
        if (isMissingOrderTrackingMigration(trackingError)) {
          console.warn(
            "Theo dõi GHN chưa được bật. Chạy migration 20261103000000_order_tracking_notifications.sql trong Supabase.",
          );
        } else {
          console.error(
            "Không thể tải thông tin vận chuyển đơn hàng.",
            trackingError,
          );
        }
        notice = appendNotice(
          notice,
          "Lịch sử đơn hàng đã tải, nhưng theo dõi GHN chưa sẵn sàng. Chạy migration 20261103000000_order_tracking_notifications.sql trong Supabase để bật tính năng này.",
        );
    } else {
      for (const order of orders) {
        const tracking = trackingRows.find(
          (row) => Number(row.id) === order.id,
        );
        if (!tracking) continue;
        order.ghn_order_code = tracking.ghn_order_code ?? null;
        order.shipping_status = tracking.shipping_status ?? null;
        order.shipping_status_label = tracking.shipping_status_label ?? null;
        order.shipping_tracking_url = tracking.shipping_tracking_url ?? null;
      }

      const { data: events, error: eventsError } = await supabase
        .from("store_order_events")
        .select("id, order_id, event_type, title, description, source, created_at")
        .in(
          "order_id",
          orders.map((order) => order.id),
        )
        .order("created_at", { ascending: true });
      if (eventsError) {
        if (isMissingOrderTrackingMigration(eventsError)) {
          console.warn(
            "Lịch sử vận chuyển chưa được bật. Chạy migration 20261103000000_order_tracking_notifications.sql trong Supabase.",
          );
        } else {
          console.error(
            "Không thể tải lịch sử trạng thái đơn hàng.",
            eventsError,
          );
        }
        notice = appendNotice(
          notice,
          "Lịch sử đơn hàng đã tải, nhưng lịch sử vận chuyển chưa sẵn sàng. Chạy migration 20261103000000_order_tracking_notifications.sql trong Supabase để bật tính năng này.",
        );
      } else {
        for (const order of orders) {
          order.events = (events ?? [])
            .filter((event) => Number(event.order_id) === order.id)
            .map((event) => ({
              id: Number(event.id),
              event_type: event.event_type,
              title: event.title,
              description: event.description,
              source: event.source,
              created_at: event.created_at,
            }));
        }
      }
    }
  }
  return { user: authData.user, data: orders, error: null, notice };
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
