"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

export type AdminLoginState = { message: string } | null;

function getAdminEmail() {
  return process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";
}

export async function adminLogin(
  _previousState: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const config = getSupabaseConfig();
  const adminEmail = getAdminEmail();
  if (!config || !adminEmail) {
    return {
      message:
        "Quản trị viên chưa được cấu hình. Hãy thiết lập Supabase và ADMIN_EMAIL trên máy chủ.",
    };
  }

  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");
  const email =
    typeof emailValue === "string" ? emailValue.trim().toLowerCase() : "";
  const password = typeof passwordValue === "string" ? passwordValue : "";

  if (email !== adminEmail || !password) {
    return { message: "Email hoặc mật khẩu không chính xác." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || data.user.email?.toLowerCase() !== adminEmail) {
    if (!error) {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.error("Không thể kết thúc phiên đăng nhập admin không hợp lệ.", signOutError);
      }
    }

    return { message: "Email hoặc mật khẩu không chính xác." };
  }

  redirect("/admin");
}

export async function adminLogout() {
  if (!getSupabaseConfig()) {
    throw new Error("Không thể đăng xuất vì Supabase chưa được cấu hình.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(`Đăng xuất thất bại: ${error.message}`);

  redirect("/admin");
}
