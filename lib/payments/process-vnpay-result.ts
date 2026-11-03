import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { VnpayResponse } from "@/lib/payments/vnpay";

export type VnpayResultState =
  | "paid"
  | "failed"
  | "already_paid"
  | "already_processed"
  | "not_found"
  | "amount_mismatch"
  | "invalid_order"
  | "error";

export async function processVnpayResult(
  parameters: VnpayResponse,
): Promise<{ state: VnpayResultState; orderNumber: string | null }> {
  const amount = Number(parameters.vnp_Amount);
  const paymentReference = parameters.vnp_TxnRef ?? "";
  const responseCode = parameters.vnp_ResponseCode ?? "";
  const transactionStatus = parameters.vnp_TransactionStatus ?? "";
  const transactionNumber = parameters.vnp_TransactionNo ?? "";
  if (
    !Number.isSafeInteger(amount) ||
    amount < 1 ||
    amount > 100_000_000_000 ||
    !/^[A-Za-z0-9]{1,100}$/.test(paymentReference) ||
    !/^[A-Za-z0-9]{2,3}$/.test(responseCode) ||
    !/^[A-Za-z0-9]{2,3}$/.test(transactionStatus) ||
    transactionNumber.length > 64
  ) {
    return { state: "invalid_order", orderNumber: null };
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    console.error("Không thể xử lý kết quả VNPay: thiếu cấu hình Supabase service role.");
    return { state: "error", orderNumber: null };
  }
  const { data, error } = await supabase.rpc("record_vnpay_payment_result", {
    p_payment_reference: paymentReference,
    p_amount_minor: amount,
    p_succeeded: responseCode === "00" && transactionStatus === "00",
    p_response_code: responseCode,
    p_transaction_number: transactionNumber || null,
  });
  if (error) {
    console.error("Không thể ghi nhận kết quả thanh toán VNPay.", error);
    return { state: "error", orderNumber: null };
  }
  if (
    typeof data !== "object" ||
    data === null ||
    !("state" in data) ||
    !("order_number" in data) ||
    typeof data.state !== "string" ||
    (data.order_number !== null && typeof data.order_number !== "string")
  ) {
    console.error("Supabase trả về kết quả VNPay không hợp lệ.", data);
    return { state: "error", orderNumber: null };
  }

  const knownStates: VnpayResultState[] = [
    "paid",
    "failed",
    "already_paid",
    "already_processed",
    "not_found",
    "amount_mismatch",
    "invalid_order",
  ];
  const state = knownStates.find((knownState) => knownState === data.state);
  if (!state) {
    console.error("Supabase trả về trạng thái VNPay không xác định.", data.state);
    return { state: "error", orderNumber: null };
  }
  return {
    state,
    orderNumber: data.order_number,
  };
}
