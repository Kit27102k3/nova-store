"use server";

import { isIP } from "node:net";
import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import {
  createVnpayPaymentUrl,
  getVnpayConfiguration,
  verifyVnpayReturnToken as verifyReturnToken,
  type VnpayConfiguration,
} from "@/lib/payments/vnpay";

export type OrderItemInput = {
  product_id: number;
  quantity: number;
  variant: string | null;
};

function isOrderItemInput(item: unknown): item is OrderItemInput {
  if (!item || typeof item !== "object") return false;
  const row = item as Record<string, unknown>;
  return (
    typeof row.product_id === "number" &&
    Number.isSafeInteger(row.product_id) &&
    row.product_id > 0 &&
    typeof row.quantity === "number" &&
    Number.isSafeInteger(row.quantity) &&
    row.quantity >= 1 &&
    row.quantity <= 99 &&
    (row.variant === null ||
      (typeof row.variant === "string" && row.variant.length <= 120))
  );
}

export type PlaceOrderResult =
  | {
      success: true;
      orderNumber: string;
      paymentMethod: "cod" | "vnpay";
      guestTrackingCode?: string;
      paymentUrl?: string;
    }
  | { success: false; message: string };

function getPublicOrderError(message: string, code?: string) {
  const knownBusinessError =
    /^(?:Mã voucher|Voucher|Giỏ hàng|Sản phẩm|Lựa chọn|Hãy sử dụng email đã đăng nhập|Thông tin đặt hàng|Danh sách sản phẩm|Phương thức thanh toán|Tổng tiền đơn hàng|Đơn hàng phải)/i;
  if (knownBusinessError.test(message)) return message;
  if (message.includes("place_store_order_with_payment")) {
    return "Thiếu hàm đặt hàng nền tảng trong Supabase. Chạy trước supabase/migrations/20261103010000_vnpay_payments.sql, sau đó reload schema.";
  }
  if (code === "PGRST202" || code === "42883") {
    return "Supabase chưa tìm thấy hàm đặt hàng mới. Hãy chạy migration 20261105000000_customer_storefront_features.sql rồi reload schema.";
  }
  if (code === "42501") {
    return "Supabase chưa cấp quyền gọi hàm đặt hàng. Hãy chạy lại migration voucher trên đúng project.";
  }
  if (code === "23514") {
    return "Dữ liệu đơn hàng không khớp quy tắc tổng tiền/giảm giá. Hãy kiểm tra migration voucher trên Supabase.";
  }
  return "Không thể ghi nhận đơn hàng. Vui lòng kiểm tra thông tin và thử lại.";
}

export async function placeStoreOrder(
  formData: FormData,
  items: OrderItemInput[],
): Promise<PlaceOrderResult> {
  const paymentMethod = formData.get("payment_method");
  if (paymentMethod !== "cod" && paymentMethod !== "vnpay") {
    return { success: false, message: "Vui lòng chọn phương thức thanh toán." };
  }
  let vnpayConfig: VnpayConfiguration | null = null;
  if (paymentMethod === "vnpay") {
    try {
      vnpayConfig = getVnpayConfiguration();
    } catch (error) {
      console.error("Cấu hình VNPay không hợp lệ.", error);
      return {
        success: false,
        message: "Cấu hình thanh toán VNPay chưa hợp lệ. Hãy kiểm tra môi trường máy chủ.",
      };
    }
    if (!vnpayConfig) {
      return {
        success: false,
        message: "Thanh toán VNPay chưa được cấu hình trên máy chủ.",
      };
    }
    if (!createSupabaseAdminClient()) {
      return {
        success: false,
        message:
          "Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY; chưa thể xác nhận thanh toán VNPay.",
      };
    }
  }
  if (!getSupabaseConfig()) {
    return {
      success: false,
      message: "Chưa cấu hình kết nối cửa hàng. Đơn hàng chưa được ghi nhận.",
    };
  }
  if (
    !Array.isArray(items) ||
    items.length === 0 ||
    items.length > 50 ||
    !items.every(isOrderItemInput)
  ) {
    return { success: false, message: "Giỏ hàng không hợp lệ." };
  }

  const getField = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value.trim() : "";
  };
  const voucherCode = getField("voucher_code").toUpperCase();
  if (voucherCode && !/^[A-Z0-9_-]{3,40}$/.test(voucherCode)) {
    return { success: false, message: "Mã voucher không hợp lệ." };
  }
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError && authError.name !== "AuthSessionMissingError") {
    console.error("Không thể xác minh tài khoản khi đặt hàng.", authError);
    return {
      success: false,
      message: "Không thể xác minh tài khoản. Vui lòng thử lại.",
    };
  }
  const guestTrackingCode = authData.user
    ? undefined
    : randomBytes(24).toString("base64url");
  const guestAccessHash = guestTrackingCode
    ? createHash("sha256").update(guestTrackingCode).digest("hex")
    : null;
  const { data, error } = await supabase.rpc("place_store_order_with_voucher", {
    p_customer_name: getField("name"),
    p_customer_email: getField("email"),
    p_customer_phone: getField("phone"),
    p_address: getField("address"),
    p_district: getField("district"),
    p_city: getField("city"),
    p_items: items,
    p_payment_method: paymentMethod,
    p_voucher_code: voucherCode,
    p_guest_access_hash: guestAccessHash,
  });
  if (error) {
    console.error("Không thể tạo đơn hàng.", error);
    return {
      success: false,
      message: getPublicOrderError(error.message, error.code),
    };
  }
  if (
    typeof data !== "object" ||
    data === null ||
    !("orderNumber" in data) ||
    !("total" in data) ||
    !("paymentReference" in data) ||
    typeof data.orderNumber !== "string" ||
    !/^NV-\d{4}-\d{6,}$/.test(data.orderNumber) ||
    typeof data.total !== "number" ||
    !Number.isSafeInteger(data.total) ||
    (data.paymentReference !== null &&
      typeof data.paymentReference !== "string")
  ) {
    console.error("Supabase không trả về dữ liệu đơn hàng hợp lệ.", data);
    return {
      success: false,
      message: "Không nhận được xác nhận đơn hàng. Vui lòng thử lại.",
    };
  }

  if (paymentMethod === "cod") {
    return {
      success: true,
      orderNumber: data.orderNumber,
      paymentMethod,
      ...(guestTrackingCode ? { guestTrackingCode } : {}),
    };
  }
  if (
    !vnpayConfig ||
    !data.paymentReference ||
    !/^[A-Za-z0-9]{1,100}$/.test(data.paymentReference) ||
    data.total < 1 ||
    data.total > 1_000_000_000
  ) {
    console.error("Đơn VNPay trả về thông tin thanh toán không hợp lệ.", data);
    return {
      success: false,
      message: "Không thể khởi tạo thanh toán VNPay cho đơn hàng này.",
    };
  }

  const requestHeaders = await headers();
  const forwardedIp = requestHeaders
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const remoteIp = requestHeaders.get("x-real-ip")?.trim();
  const candidateIp = forwardedIp || remoteIp || "";
  const ipAddress = isIP(candidateIp) === 4 ? candidateIp : "127.0.0.1";
  const paymentUrl = createVnpayPaymentUrl({
    config: vnpayConfig,
    amount: data.total,
    orderNumber: data.orderNumber,
    paymentReference: data.paymentReference,
    ipAddress,
  });
  return {
    success: true,
    orderNumber: data.orderNumber,
    paymentMethod,
    ...(guestTrackingCode ? { guestTrackingCode } : {}),
    paymentUrl,
  };
}

export type GuestOrderSummary = {
  orderNumber: string;
  status: "pending" | "confirmed" | "shipping" | "completed" | "cancelled";
  paymentMethod: "cod" | "vnpay";
  paymentStatus: "unpaid" | "pending" | "paid" | "failed" | "cancelled";
  createdAt: string;
  total: number;
  trackingUrl: string | null;
  items: Array<{
    name: string;
    variant: string | null;
    quantity: number;
  }>;
  events: Array<{ title: string; createdAt: string }>;
};

export async function lookupGuestOrder(
  orderNumberInput: string,
  accessCodeInput: string,
): Promise<{ success: true; order: GuestOrderSummary } | { success: false; message: string }> {
  const orderNumber = orderNumberInput.trim().toUpperCase();
  const accessCode = accessCodeInput.trim();
  if (
    !/^NV-\d{4}-\d{6,}$/.test(orderNumber) ||
    !/^[A-Za-z0-9_-]{32}$/.test(accessCode)
  ) {
    return {
      success: false,
      message: "Mã đơn hoặc mã tra cứu không hợp lệ.",
    };
  }
  if (!getSupabaseConfig()) {
    return { success: false, message: "Chức năng tra cứu đơn chưa được cấu hình." };
  }

  const tokenHash = createHash("sha256").update(accessCode).digest("hex");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("lookup_guest_store_order", {
    p_order_number: orderNumber,
    p_token_hash: tokenHash,
  });
  if (error) {
    console.error("Không thể tra cứu đơn hàng khách.", error);
    return { success: false, message: "Chưa thể tra cứu đơn hàng. Vui lòng thử lại." };
  }
  if (!data || typeof data !== "object") {
    return {
      success: false,
      message: "Không tìm thấy đơn hàng hoặc mã tra cứu không chính xác.",
    };
  }

  const value = data as Record<string, unknown>;
  const statuses = ["pending", "confirmed", "shipping", "completed", "cancelled"];
  const paymentMethods = ["cod", "vnpay"];
  const paymentStatuses = ["unpaid", "pending", "paid", "failed", "cancelled"];
  if (
    typeof value.order_number !== "string" ||
    typeof value.status !== "string" ||
    !statuses.includes(value.status) ||
    typeof value.payment_method !== "string" ||
    !paymentMethods.includes(value.payment_method) ||
    typeof value.payment_status !== "string" ||
    !paymentStatuses.includes(value.payment_status) ||
    typeof value.created_at !== "string" ||
    typeof value.total !== "number" ||
    !Number.isSafeInteger(value.total) ||
    !(value.tracking_url === null || typeof value.tracking_url === "string") ||
    !Array.isArray(value.items) ||
    !Array.isArray(value.events)
  ) {
    console.error("Dữ liệu tra cứu đơn khách không hợp lệ.", data);
    return { success: false, message: "Dữ liệu đơn hàng chưa thể hiển thị." };
  }

  const items = value.items.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    return typeof row.name === "string" &&
      (row.variant === null || typeof row.variant === "string") &&
      typeof row.quantity === "number" &&
      Number.isSafeInteger(row.quantity)
      ? [{ name: row.name, variant: row.variant, quantity: row.quantity }]
      : [];
  });
  const events = value.events.flatMap((event) => {
    if (!event || typeof event !== "object") return [];
    const row = event as Record<string, unknown>;
    return typeof row.title === "string" && typeof row.created_at === "string"
      ? [{ title: row.title, createdAt: row.created_at }]
      : [];
  });
  return {
    success: true,
    order: {
      orderNumber: value.order_number,
      status: value.status as GuestOrderSummary["status"],
      paymentMethod: value.payment_method as GuestOrderSummary["paymentMethod"],
      paymentStatus: value.payment_status as GuestOrderSummary["paymentStatus"],
      createdAt: value.created_at,
      total: value.total,
      trackingUrl: value.tracking_url,
      items,
      events,
    },
  };
}

export async function verifyVnpayReturnToken(token: string) {
  if (typeof token !== "string" || token.length > 2048) {
    return { valid: false as const };
  }
  const secret = process.env.VNPAY_HASH_SECRET?.trim();
  if (!secret) return { valid: false as const };
  const result = verifyReturnToken(token, secret);
  return result ? { valid: true as const, ...result } : { valid: false as const };
}
