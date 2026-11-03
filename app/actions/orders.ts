"use server";

import { isIP } from "node:net";
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

export type PlaceOrderResult =
  | {
      success: true;
      orderNumber: string;
      paymentMethod: "cod" | "vnpay";
      paymentUrl?: string;
    }
  | { success: false; message: string };

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
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    return { success: false, message: "Giỏ hàng không hợp lệ." };
  }

  const getField = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value.trim() : "";
  };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("place_store_order_with_payment", {
    p_customer_name: getField("name"),
    p_customer_email: getField("email"),
    p_customer_phone: getField("phone"),
    p_address: getField("address"),
    p_district: getField("district"),
    p_city: getField("city"),
    p_items: items,
    p_payment_method: paymentMethod,
  });
  if (error) {
    console.error("Không thể tạo đơn hàng.", error);
    return {
      success: false,
      message:
        error.message.includes("tồn kho") ||
        error.message.includes("không còn khả dụng") ||
        error.message.includes("thanh toán VNPay")
          ? error.message
          : "Không thể ghi nhận đơn hàng. Vui lòng kiểm tra thông tin và thử lại.",
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
    paymentUrl,
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
