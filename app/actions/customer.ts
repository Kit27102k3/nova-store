"use server";

import { revalidatePath } from "next/cache";
import {
  getSupabaseConfig,
} from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CustomerActionResult = {
  success: boolean;
  message: string;
};

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

async function getAuthenticatedClient() {
  if (!getSupabaseConfig()) {
    return { client: null, error: "Chưa cấu hình kết nối tài khoản." };
  }
  const client = await createSupabaseServerClient();
  const { data, error } = await client.auth.getUser();
  if (error && error.name !== "AuthSessionMissingError") {
    console.error("Không thể xác minh người dùng khi cập nhật tài khoản.", error);
    return { client: null, error: "Không thể xác minh tài khoản." };
  }
  if (!data.user) {
    return { client: null, error: "Vui lòng đăng nhập để tiếp tục." };
  }
  return { client, user: data.user, error: null };
}

export async function saveCustomerProfile(
  formData: FormData,
): Promise<CustomerActionResult> {
  const name = field(formData, "name").replace(/\s+/g, " ");
  const phone = field(formData, "phone");
  if (name.length < 2 || name.length > 120 || phone.length > 32) {
    return {
      success: false,
      message: "Tên cần từ 2 đến 120 ký tự; số điện thoại tối đa 32 ký tự.",
    };
  }
  const { client, user, error: authError } = await getAuthenticatedClient();
  if (!client || !user) {
    return { success: false, message: authError ?? "Vui lòng đăng nhập." };
  }

  const { error: authUpdateError } = await client.auth.updateUser({
    data: { ...user.user_metadata, full_name: name },
  });
  if (authUpdateError) {
    console.error("Không thể cập nhật tên tài khoản Supabase.", authUpdateError);
    return { success: false, message: "Không thể cập nhật hồ sơ. Hãy thử lại." };
  }

  const { data, error } = await client
    .from("profiles")
    .update({ full_name: name, phone })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("Không thể lưu hồ sơ khách hàng.", error);
    return {
      success: false,
      message:
        "Tên đã cập nhật nhưng không lưu được số điện thoại. Hãy kiểm tra migration hồ sơ.",
    };
  }
  revalidatePath("/account");
  return { success: true, message: "Đã cập nhật thông tin tài khoản." };
}

export async function saveCustomerAddress(
  formData: FormData,
): Promise<CustomerActionResult> {
  const id = field(formData, "id") || null;
  const label = field(formData, "label");
  const name = field(formData, "name");
  const phone = field(formData, "phone");
  const street = field(formData, "street");
  const district = field(formData, "district");
  const city = field(formData, "city");
  if (
    (id !== null &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) ||
    label.length < 1 ||
    label.length > 60 ||
    name.length < 2 ||
    name.length > 120 ||
    phone.length < 6 ||
    phone.length > 32 ||
    street.length < 3 ||
    street.length > 240 ||
    district.length < 2 ||
    district.length > 120 ||
    city.length < 2 ||
    city.length > 120
  ) {
    return { success: false, message: "Vui lòng kiểm tra thông tin địa chỉ." };
  }

  const { client, error: authError } = await getAuthenticatedClient();
  if (!client) return { success: false, message: authError ?? "Vui lòng đăng nhập." };
  const { error } = await client.rpc("save_customer_address", {
    p_id: id,
    p_label: label,
    p_recipient_name: name,
    p_phone: phone,
    p_street: street,
    p_district: district,
    p_city: city,
    p_is_default: formData.get("isDefault") === "on",
  });
  if (error) {
    console.error("Không thể lưu địa chỉ khách hàng.", error);
    return {
      success: false,
      message: "Không thể lưu địa chỉ. Hãy chạy migration tài khoản mới nhất.",
    };
  }
  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
  return { success: true, message: id ? "Đã cập nhật địa chỉ." : "Đã thêm địa chỉ." };
}

export async function deleteCustomerAddress(
  formData: FormData,
): Promise<CustomerActionResult> {
  const id = field(formData, "id");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return { success: false, message: "Địa chỉ không hợp lệ." };
  }
  const { client, error: authError } = await getAuthenticatedClient();
  if (!client) return { success: false, message: authError ?? "Vui lòng đăng nhập." };
  const { error } = await client.rpc("delete_customer_address", { p_id: id });
  if (error) {
    console.error("Không thể xóa địa chỉ khách hàng.", error);
    return { success: false, message: "Không thể xóa địa chỉ. Hãy thử lại." };
  }
  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
  return { success: true, message: "Đã xóa địa chỉ." };
}

export async function cancelCustomerOrder(
  formData: FormData,
): Promise<CustomerActionResult> {
  const id = Number(field(formData, "id"));
  if (!Number.isSafeInteger(id) || id < 1) {
    return { success: false, message: "Mã đơn hàng không hợp lệ." };
  }
  const { client, error: authError } = await getAuthenticatedClient();
  if (!client) return { success: false, message: authError ?? "Vui lòng đăng nhập." };
  const { error } = await client.rpc("cancel_customer_order", {
    p_order_id: id,
  });
  if (error) {
    console.error("Không thể hủy đơn hàng của khách.", error);
    return {
      success: false,
      message: error.message.includes("chờ xác nhận")
        ? error.message
        : "Không thể hủy đơn hàng. Hãy thử liên hệ bộ phận hỗ trợ.",
    };
  }
  revalidatePath("/account/orders");
  revalidatePath("/admin");
  return { success: true, message: "Đã hủy đơn hàng." };
}
