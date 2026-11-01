"use server";

import { getSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type EngagementState =
  | { status: "success" | "error"; message: string }
  | null;

export async function subscribeToNewsletter(
  _previousState: EngagementState,
  formData: FormData,
): Promise<EngagementState> {
  const rawEmail = formData.get("email");
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return { status: "error", message: "Vui lòng nhập địa chỉ email hợp lệ." };
  }
  if (!getSupabaseConfig()) {
    return {
      status: "error",
      message: "Chưa cấu hình hệ thống đăng ký nhận tin. Vui lòng thử lại sau.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("subscribe_store_newsletter", {
    p_email: email,
  });
  if (error) {
    console.error("Không thể lưu đăng ký nhận tin.", error);
    return {
      status: "error",
      message: "Chưa thể đăng ký nhận tin. Vui lòng thử lại sau.",
    };
  }
  return {
    status: "success",
    message: "Đăng ký thành công. Email này sẽ nhận thông tin từ Nova Store.",
  };
}
