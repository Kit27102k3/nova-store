import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { stringify } from "node:querystring";

export type VnpayConfiguration = {
  tmnCode: string;
  hashSecret: string;
  paymentUrl: string;
  returnUrl: string;
};

export type VnpayReturnStatus = "paid" | "failed";

export type VnpayResponse = Record<string, string>;

function isHttpLocalhost(url: URL) {
  return (
    url.protocol === "http:" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1")
  );
}

export function getVnpayConfiguration(): VnpayConfiguration | null {
  const tmnCode = process.env.VNPAY_TMN_CODE?.trim() ?? "";
  const hashSecret = process.env.VNPAY_HASH_SECRET?.trim() ?? "";
  const paymentUrlValue = process.env.VNPAY_PAYMENT_URL?.trim() ?? "";
  const returnUrlValue = process.env.VNPAY_RETURN_URL?.trim() ?? "";
  const configuredValues = [tmnCode, hashSecret, paymentUrlValue, returnUrlValue];

  if (configuredValues.every((value) => !value)) return null;
  if (configuredValues.some((value) => !value)) {
    throw new Error("Cần cấu hình đầy đủ các biến môi trường VNPay.");
  }
  if (!/^[A-Za-z0-9]{1,16}$/.test(tmnCode)) {
    throw new Error("VNPAY_TMN_CODE không hợp lệ.");
  }

  const paymentUrl = new URL(paymentUrlValue);
  if (
    paymentUrl.protocol !== "https:" ||
    !["sandbox.vnpayment.vn", "pay.vnpay.vn"].includes(paymentUrl.hostname) ||
    paymentUrl.username ||
    paymentUrl.password ||
    paymentUrl.search ||
    paymentUrl.hash
  ) {
    throw new Error("VNPAY_PAYMENT_URL phải là URL thanh toán VNPay chính thức.");
  }

  const returnUrl = new URL(returnUrlValue);
  const siteUrlValue = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!siteUrlValue) {
    throw new Error("Cần cấu hình NEXT_PUBLIC_SITE_URL để nhận kết quả VNPay.");
  }
  const siteUrl = new URL(siteUrlValue);
  if (
    returnUrl.pathname !== "/api/payments/vnpay/return" ||
    returnUrl.search ||
    returnUrl.hash ||
    returnUrl.username ||
    returnUrl.password ||
    returnUrl.origin !== siteUrl.origin ||
    (returnUrl.protocol !== "https:" && !isHttpLocalhost(returnUrl))
  ) {
    throw new Error(
      "VNPAY_RETURN_URL phải cùng origin và trỏ đến /api/payments/vnpay/return.",
    );
  }

  return {
    tmnCode,
    hashSecret,
    paymentUrl: paymentUrl.toString(),
    returnUrl: returnUrl.toString(),
  };
}

function sortedEntries(parameters: Record<string, string>) {
  return Object.entries(parameters).sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0,
  );
}

function hashQueryString(parameters: Record<string, string>) {
  return stringify(
    Object.fromEntries(sortedEntries(parameters)),
    "&",
    "=",
    { encodeURIComponent: (value) => value },
  );
}

function encodedQueryString(parameters: Record<string, string>) {
  const query = new URLSearchParams();
  for (const [key, value] of sortedEntries(parameters)) {
    query.append(key, value);
  }
  return query.toString();
}

function signature(value: string, secret: string) {
  return createHmac("sha512", secret).update(value, "utf8").digest("hex");
}

function vietnameseDateTime(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}${values.month}${values.day}${values.hour}${values.minute}${values.second}`;
}

export function createVnpayPaymentUrl({
  config,
  amount,
  orderNumber,
  paymentReference,
  ipAddress,
  now = new Date(),
}: {
  config: VnpayConfiguration;
  amount: number;
  orderNumber: string;
  paymentReference: string;
  ipAddress: string;
  now?: Date;
}) {
  if (
    !Number.isSafeInteger(amount) ||
    amount < 1 ||
    amount > 1_000_000_000 ||
    !/^[A-Za-z0-9]{1,100}$/.test(paymentReference)
  ) {
    throw new Error("Thông tin đơn hàng không hợp lệ để thanh toán VNPay.");
  }

  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
  const parameters = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: config.tmnCode,
    vnp_Amount: String(amount * 100),
    vnp_CurrCode: "VND",
    vnp_TxnRef: paymentReference,
    vnp_OrderInfo: `Thanh toan don hang ${orderNumber}`,
    vnp_OrderType: "other",
    vnp_Locale: "vn",
    vnp_ReturnUrl: config.returnUrl,
    vnp_IpAddr: ipAddress,
    vnp_CreateDate: vietnameseDateTime(now),
    vnp_ExpireDate: vietnameseDateTime(expiresAt),
  };
  const secureHash = signature(
    hashQueryString(parameters),
    config.hashSecret,
  );
  const query = encodedQueryString(parameters);
  return `${config.paymentUrl}?${query}&vnp_SecureHash=${secureHash}`;
}

export function parseVnpayResponse(
  searchParams: URLSearchParams,
): VnpayResponse | null {
  const parameters: VnpayResponse = {};
  for (const [key, value] of searchParams) {
    if (!key.startsWith("vnp_") || key in parameters || value.length > 2048) {
      return null;
    }
    parameters[key] = value;
  }
  return parameters;
}

export function verifyVnpayResponse(
  parameters: VnpayResponse,
  config: VnpayConfiguration,
) {
  const providedHash = parameters.vnp_SecureHash ?? "";
  if (
    parameters.vnp_TmnCode !== config.tmnCode ||
    !/^[A-Fa-f0-9]{128}$/.test(providedHash)
  ) {
    return false;
  }
  const signed = Object.fromEntries(
    Object.entries(parameters).filter(
      ([key]) => key !== "vnp_SecureHash" && key !== "vnp_SecureHashType",
    ),
  );
  const expectedHash = signature(
    hashQueryString(signed),
    config.hashSecret,
  );
  const providedBytes = Buffer.from(providedHash, "hex");
  const expectedBytes = Buffer.from(expectedHash, "hex");
  return (
    providedBytes.length === expectedBytes.length &&
    timingSafeEqual(providedBytes, expectedBytes)
  );
}

export function createVnpayReturnToken({
  orderNumber,
  status,
  secret,
  now = Date.now(),
}: {
  orderNumber: string;
  status: VnpayReturnStatus;
  secret: string;
  now?: number;
}) {
  const payload = Buffer.from(
    JSON.stringify({ orderNumber, status, expiresAt: now + 5 * 60 * 1000 }),
  ).toString("base64url");
  const tokenSignature = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  return `${payload}.${tokenSignature}`;
}

export function verifyVnpayReturnToken(
  token: string,
  secret: string,
  now = Date.now(),
): { orderNumber: string; status: VnpayReturnStatus } | null {
  const [payload, providedSignature, ...extra] = token.split(".");
  if (
    !payload ||
    !providedSignature ||
    extra.length ||
    !/^[A-Za-z0-9_-]+$/.test(providedSignature)
  ) {
    return null;
  }
  const expectedSignature = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  const providedBytes = Buffer.from(providedSignature);
  const expectedBytes = Buffer.from(expectedSignature);
  if (
    providedBytes.length !== expectedBytes.length ||
    !timingSafeEqual(providedBytes, expectedBytes)
  ) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("orderNumber" in parsed) ||
      !("status" in parsed) ||
      !("expiresAt" in parsed) ||
      typeof parsed.orderNumber !== "string" ||
      !/^NV-\d{4}-\d{6,}$/.test(parsed.orderNumber) ||
      (parsed.status !== "paid" && parsed.status !== "failed") ||
      typeof parsed.expiresAt !== "number" ||
      parsed.expiresAt < now
    ) {
      return null;
    }
    return { orderNumber: parsed.orderNumber, status: parsed.status };
  } catch {
    return null;
  }
}
