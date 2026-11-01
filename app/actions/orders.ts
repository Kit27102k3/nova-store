"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

export type OrderItemInput = {
  product_id: number;
  quantity: number;
  variant: string | null;
};

export type PlaceOrderResult =
  | { success: true; orderNumber: string }
  | { success: false; message: string };

export async function placeStoreOrder(
  formData: FormData,
  items: OrderItemInput[],
): Promise<PlaceOrderResult> {
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
  const { data, error } = await supabase.rpc("place_store_order", {
    p_customer_name: getField("name"),
    p_customer_email: getField("email"),
    p_customer_phone: getField("phone"),
    p_address: getField("address"),
    p_district: getField("district"),
    p_city: getField("city"),
    p_items: items,
  });
  if (error) {
    console.error("Không thể tạo đơn hàng.", error);
    return {
      success: false,
      message:
        error.message.includes("tồn kho") ||
        error.message.includes("không còn khả dụng")
          ? error.message
          : "Không thể ghi nhận đơn hàng. Vui lòng kiểm tra thông tin và thử lại.",
    };
  }
  if (typeof data !== "string" || !data) {
    console.error("Supabase không trả về mã đơn hàng hợp lệ.", data);
    return {
      success: false,
      message: "Không nhận được xác nhận đơn hàng. Vui lòng thử lại.",
    };
  }
  return { success: true, orderNumber: data };
}
