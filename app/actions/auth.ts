"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

export type AuthFormState =
  | { status: "error" | "success"; message: string }
  | null;

function getEmail(formData: FormData) {
  const email = formData.get("email");
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function getPassword(formData: FormData) {
  const password = formData.get("password");
  return typeof password === "string" ? password : "";
}

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

function getAuthErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) {
    return "Email hoặc mật khẩu không chính xác.";
  }
  if (
    normalized.includes("already registered") ||
    normalized.includes("already been registered")
  ) {
    return "Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Bạn cần xác nhận email trước khi đăng nhập.";
  }
  return message;
}

function getConfigurationError(): AuthFormState {
  return {
    status: "error",
    message:
      "Chưa cấu hình Supabase. Hãy thêm URL và publishable/anon key vào .env.local rồi khởi động lại ứng dụng.",
  };
}

export async function register(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!getSupabaseConfig()) return getConfigurationError();

  const nameValue = formData.get("name");
  const name =
    typeof nameValue === "string"
      ? nameValue.trim().replace(/\s+/g, " ")
      : "";
  const email = getEmail(formData);
  const password = getPassword(formData);
  const confirmPassword = formData.get("confirmPassword");

  if (name.length < 2 || name.length > 120) {
    return {
      status: "error",
      message: "Họ tên cần có từ 2 đến 120 ký tự.",
    };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "error", message: "Vui lòng nhập địa chỉ email hợp lệ." };
  }
  if (password.length < 8) {
    return {
      status: "error",
      message: "Mật khẩu cần có ít nhất 8 ký tự.",
    };
  }
  if (confirmPassword !== password) {
    return { status: "error", message: "Mật khẩu xác nhận chưa khớp." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/account`,
    },
  });

  if (error) {
    return { status: "error", message: getAuthErrorMessage(error.message) };
  }

  if (data.session) redirect("/account");

  return {
    status: "success",
    message:
      "Tài khoản đã được tạo. Hãy kiểm tra hộp thư để xác nhận email trước khi đăng nhập.",
  };
}

export async function login(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!getSupabaseConfig()) return getConfigurationError();

  const email = getEmail(formData);
  const password = getPassword(formData);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) {
    return {
      status: "error",
      message: "Vui lòng nhập email và mật khẩu hợp lệ.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { status: "error", message: getAuthErrorMessage(error.message) };
  }

  redirect("/account");
}

export async function requestPasswordReset(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!getSupabaseConfig()) return getConfigurationError();

  const email = getEmail(formData);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "error", message: "Vui lòng nhập địa chỉ email hợp lệ." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=/account/reset-password`,
  });

  if (error) {
    return { status: "error", message: getAuthErrorMessage(error.message) };
  }

  return {
    status: "success",
    message:
      "Nếu email đã được đăng ký, hướng dẫn đặt lại mật khẩu sẽ được gửi đến hộp thư của bạn.",
  };
}

export async function updatePassword(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!getSupabaseConfig()) return getConfigurationError();

  const password = getPassword(formData);
  if (password.length < 8) {
    return {
      status: "error",
      message: "Mật khẩu mới cần có ít nhất 8 ký tự.",
    };
  }
  if (formData.get("confirmPassword") !== password) {
    return { status: "error", message: "Mật khẩu xác nhận chưa khớp." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { status: "error", message: getAuthErrorMessage(error.message) };
  }

  redirect("/account?auth=password-updated");
}

export async function logout() {
  if (!getSupabaseConfig()) {
    throw new Error("Không thể đăng xuất vì Supabase chưa được cấu hình.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(`Đăng xuất thất bại: ${error.message}`);

  redirect("/account");
}
