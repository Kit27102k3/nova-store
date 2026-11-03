import {
  connection,
  NextResponse,
  type NextRequest,
} from "next/server";
import {
  createVnpayReturnToken,
  getVnpayConfiguration,
  parseVnpayResponse,
  verifyVnpayResponse,
  type VnpayReturnStatus,
} from "@/lib/payments/vnpay";
import { processVnpayResult } from "@/lib/payments/process-vnpay-result";

function checkoutRedirect(payment: string, token?: string) {
  const siteUrlValue = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!siteUrlValue) {
    return NextResponse.json(
      { error: "Chưa cấu hình địa chỉ website." },
      { status: 503 },
    );
  }
  let siteUrl: URL;
  try {
    siteUrl = new URL(siteUrlValue);
  } catch (error) {
    console.error("NEXT_PUBLIC_SITE_URL không hợp lệ.", error);
    return NextResponse.json(
      { error: "Cấu hình địa chỉ website không hợp lệ." },
      { status: 503 },
    );
  }
  if (
    siteUrl.protocol !== "https:" &&
    !(
      siteUrl.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(siteUrl.hostname)
    )
  ) {
    return NextResponse.json(
      { error: "Địa chỉ website phải sử dụng HTTPS." },
      { status: 503 },
    );
  }
  const destination = new URL("/checkout", siteUrl);
  destination.searchParams.set("payment", payment);
  if (token) destination.searchParams.set("token", token);
  return NextResponse.redirect(destination);
}

export async function GET(request: NextRequest) {
  await connection();
  let config;
  try {
    config = getVnpayConfiguration();
  } catch (error) {
    console.error("Cấu hình VNPay không hợp lệ khi nhận kết quả.", error);
    return checkoutRedirect("unavailable");
  }
  if (!config) return checkoutRedirect("unavailable");

  const parameters = parseVnpayResponse(request.nextUrl.searchParams);
  if (!parameters || !verifyVnpayResponse(parameters, config)) {
    return checkoutRedirect("invalid");
  }

  const result = await processVnpayResult(parameters);
  if (!result.orderNumber) {
    return checkoutRedirect("error");
  }
  let status: VnpayReturnStatus;
  if (result.state === "paid" || result.state === "already_paid") {
    status = "paid";
  } else if (
    result.state === "failed" ||
    result.state === "already_processed"
  ) {
    status = "failed";
  } else {
    return checkoutRedirect("error");
  }

  const token = createVnpayReturnToken({
    orderNumber: result.orderNumber,
    status,
    secret: config.hashSecret,
  });
  return checkoutRedirect("return", token);
}
