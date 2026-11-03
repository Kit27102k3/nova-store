import {
  connection,
  NextResponse,
  type NextRequest,
} from "next/server";
import {
  getVnpayConfiguration,
  parseVnpayResponse,
  verifyVnpayResponse,
} from "@/lib/payments/vnpay";
import { processVnpayResult } from "@/lib/payments/process-vnpay-result";

function response(RspCode: string, Message: string) {
  return NextResponse.json({ RspCode, Message });
}

export async function GET(request: NextRequest) {
  await connection();
  let config;
  try {
    config = getVnpayConfiguration();
  } catch (error) {
    console.error("Cấu hình VNPay không hợp lệ khi nhận IPN.", error);
    return response("99", "Configuration error");
  }
  if (!config) return response("99", "Configuration error");

  const parameters = parseVnpayResponse(new URL(request.url).searchParams);
  if (!parameters || !verifyVnpayResponse(parameters, config)) {
    return response("97", "Invalid signature");
  }

  const result = await processVnpayResult(parameters);
  switch (result.state) {
    case "paid":
    case "failed":
    case "already_paid":
    case "already_processed":
      return response("00", "Confirm Success");
    case "not_found":
    case "invalid_order":
      return response("01", "Order not found");
    case "amount_mismatch":
      return response("04", "Invalid amount");
    case "error":
      return response("99", "Unknown error");
  }
}
