import "server-only";

import nodemailer from "nodemailer";
import { formatPrice } from "@/data/products";

export type OrderNotification = {
  recipient: string;
  customerName: string;
  orderNumber: string;
  title: string;
  description: string;
  trackingUrl: string | null;
  total: number;
};

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
};

export function getSmtpConfiguration(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM?.trim();
  const portValue = process.env.SMTP_PORT?.trim();
  const secureValue = process.env.SMTP_SECURE?.trim().toLowerCase();
  if (![host, user, password, from].some(Boolean)) return null;

  const port = Number(portValue || "587");
  const secure = secureValue || (port === 465 ? "true" : "false");
  if (
    !host ||
    !user ||
    !password ||
    !from ||
    !Number.isSafeInteger(port) ||
    port < 1 ||
    port > 65535 ||
    !["true", "false"].includes(secure)
  ) {
    throw new Error(
      "Cấu hình SMTP chưa đầy đủ. Kiểm tra SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD và SMTP_FROM.",
    );
  }

  return { host, port, secure: secure === "true", user, password, from };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export async function sendOrderNotificationEmail(
  notification: OrderNotification,
) {
  const config = getSmtpConfiguration();
  if (!config) {
    throw new Error("Chưa cấu hình SMTP trên máy chủ.");
  }
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

  const title = escapeHtml(notification.title);
  const description = escapeHtml(notification.description);
  const customerName = escapeHtml(notification.customerName);
  const orderNumber = escapeHtml(notification.orderNumber);
  const trackingLink = notification.trackingUrl
    ? `<p><a href="${escapeHtml(notification.trackingUrl)}">Theo dõi vận đơn GHN</a></p>`
    : "";
  const text = [
    `Xin chào ${notification.customerName},`,
    "",
    notification.title,
    notification.description,
    `Mã đơn hàng: ${notification.orderNumber}`,
    `Tổng tiền: ${formatPrice(notification.total)}`,
    notification.trackingUrl
      ? `Theo dõi vận đơn: ${notification.trackingUrl}`
      : "",
    "",
    "Nova Store",
  ]
    .filter(Boolean)
    .join("\n");

  await transporter.sendMail({
    from: config.from,
    to: notification.recipient,
    subject: `[Nova Store] ${notification.title} · ${notification.orderNumber}`,
    text,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172136"><p>Xin chào ${customerName},</p><h2>${title}</h2><p>${description}</p><p>Mã đơn hàng: <strong>${orderNumber}</strong></p><p>Tổng tiền: <strong>${escapeHtml(formatPrice(notification.total))}</strong></p>${trackingLink}<p>Nova Store</p></div>`,
  });
}
