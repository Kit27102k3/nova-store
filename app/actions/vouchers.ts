"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import type {
  AvailableVoucher,
  VoucherQuote,
} from "@/lib/vouchers";
import type { OrderItemInput } from "@/app/actions/orders";

function isVoucherQuote(value: unknown): value is VoucherQuote {
  if (!value || typeof value !== "object") return false;
  const quote = value as Record<string, unknown>;
  return (
    typeof quote.code === "string" &&
    /^[A-Z0-9_-]{3,40}$/.test(quote.code) &&
    typeof quote.discount === "number" &&
    Number.isSafeInteger(quote.discount) &&
    quote.discount >= 0 &&
    typeof quote.subtotal === "number" &&
    Number.isSafeInteger(quote.subtotal) &&
    quote.subtotal >= 0 &&
    quote.discount <= quote.subtotal
  );
}

function isAvailableVoucher(value: unknown): value is AvailableVoucher {
  if (!value || typeof value !== "object") return false;
  const voucher = value as Record<string, unknown>;
  return (
    typeof voucher.code === "string" &&
    (voucher.discount_type === "percent" || voucher.discount_type === "fixed") &&
    typeof voucher.discount_value === "number" &&
    Number.isSafeInteger(voucher.discount_value) &&
    voucher.discount_value > 0 &&
    (voucher.discount_type !== "percent" || voucher.discount_value <= 100) &&
    typeof voucher.min_subtotal === "number" &&
    Number.isSafeInteger(voucher.min_subtotal) &&
    voucher.min_subtotal >= 0 &&
    (voucher.max_discount === null ||
      (typeof voucher.max_discount === "number" &&
        Number.isSafeInteger(voucher.max_discount) &&
        voucher.max_discount > 0)) &&
    (voucher.expires_at === null || typeof voucher.expires_at === "string")
  );
}

function isOrderItems(value: unknown): value is OrderItemInput[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= 50 &&
    value.every((item) => {
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
    })
  );
}

function publicVoucherError(message: string) {
  if (
    /voucher|giỏ hàng|sản phẩm|tồn kho|tối thiểu/i.test(message) &&
    message.length <= 240
  ) {
    return message;
  }
  return "Không thể kiểm tra voucher. Vui lòng thử lại.";
}

export async function quoteStoreVoucher(
  code: string,
  items: OrderItemInput[],
): Promise<
  | { success: true; quote: VoucherQuote }
  | { success: false; message: string }
> {
  if (
    typeof code !== "string" ||
    !/^[A-Za-z0-9_-]{3,40}$/.test(code.trim()) ||
    !isOrderItems(items)
  ) {
    return { success: false, message: "Mã voucher hoặc giỏ hàng không hợp lệ." };
  }
  if (!getSupabaseConfig()) {
    return {
      success: false,
      message: "Chưa cấu hình kết nối cửa hàng để kiểm tra voucher.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("quote_store_voucher", {
    p_code: code.trim().toUpperCase(),
    p_items: items,
  });
  if (error) {
    console.error("Không thể kiểm tra voucher.", error);
    return { success: false, message: publicVoucherError(error.message) };
  }
  if (!isVoucherQuote(data)) {
    console.error("Supabase không trả về thông tin voucher hợp lệ.", data);
    return {
      success: false,
      message: "Không nhận được kết quả kiểm tra voucher. Vui lòng thử lại.",
    };
  }
  return { success: true, quote: data };
}

export async function listAvailableStoreVouchers(): Promise<
  | { success: true; vouchers: AvailableVoucher[] }
  | { success: false; message: string }
> {
  if (!getSupabaseConfig()) {
    return {
      success: false,
      message: "Chưa cấu hình kết nối cửa hàng để tải voucher.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("list_available_store_vouchers");
  if (error) {
    console.error("Không thể tải danh sách voucher.", error);
    return {
      success: false,
      message: "Không thể tải danh sách ưu đãi. Vui lòng thử lại sau.",
    };
  }
  if (!Array.isArray(data) || !data.every(isAvailableVoucher)) {
    console.error("Supabase không trả về danh sách voucher hợp lệ.", data);
    return {
      success: false,
      message: "Danh sách ưu đãi nhận được không hợp lệ.",
    };
  }
  return { success: true, vouchers: data };
}
