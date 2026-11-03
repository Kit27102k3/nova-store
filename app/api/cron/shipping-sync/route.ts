import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  getGhnTrackingStatus,
  getGhnTrackingUrl,
  isGhnConfigured,
} from "@/lib/shipping/ghn";
import {
  getSmtpConfiguration,
  sendOrderNotificationEmail,
} from "@/lib/notifications/order-email";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type OrderForNotification = {
  id: number;
  order_number: string;
  customer_name: string;
  customer_email: string;
  total: number;
  shipping_tracking_url: string | null;
};

function isAuthorized(request: Request) {
  const expected = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization") ?? "";
  const provided = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  if (!expected || expected.length < 32 || !provided) return false;
  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  return (
    expectedBytes.length === providedBytes.length &&
    timingSafeEqual(expectedBytes, providedBytes)
  );
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Lỗi không xác định.";
}

async function syncOrderTracking(
  supabase: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  order: {
    id: number;
    ghn_order_code: string | null;
    shipping_status: string | null;
  },
  results: { trackingUpdated: number; trackingUnchanged: number; trackingErrors: number },
) {
  if (!order.ghn_order_code) return;
  if (["delivered", "returned", "cancel"].includes(order.shipping_status ?? "")) {
    results.trackingUnchanged += 1;
    return;
  }
  try {
    const tracking = await getGhnTrackingStatus(order.ghn_order_code);
    if (tracking.code === order.shipping_status) {
      results.trackingUnchanged += 1;
      return;
    }
    const trackingUrl = getGhnTrackingUrl(order.ghn_order_code);
    const { error } = await supabase
      .from("store_orders")
      .update({
        shipping_status: tracking.code,
        shipping_status_label: tracking.label,
        shipping_tracking_url: trackingUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);
    if (error) throw error;
    results.trackingUpdated += 1;
  } catch (error) {
    results.trackingErrors += 1;
    console.error(`Không thể đồng bộ vận đơn GHN cho đơn ${order.id}.`, error);
  }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Không được phép." }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Chưa cấu hình Supabase service role trên máy chủ." },
      { status: 503 },
    );
  }

  const results = {
    trackingUpdated: 0,
    trackingUnchanged: 0,
    trackingErrors: 0,
    emailsSent: 0,
    emailErrors: 0,
    emailsWaitingForConfiguration: 0,
  };

  if (isGhnConfigured()) {
    const { data: orders, error } = await supabase
      .from("store_orders")
      .select("id, ghn_order_code, shipping_status")
      .not("ghn_order_code", "is", null)
      .order("updated_at", { ascending: true })
      .limit(100);
    if (error) {
      console.error("Không thể tải đơn hàng cần đồng bộ GHN.", error);
      return NextResponse.json(
        { error: "Không thể tải đơn hàng cần đồng bộ." },
        { status: 500 },
      );
    }

    const activeOrders = (orders ?? []).filter(
      (order) => !["delivered", "returned", "cancel"].includes(order.shipping_status ?? ""),
    );
    for (let index = 0; index < activeOrders.length; index += 5) {
      await Promise.all(
        activeOrders
          .slice(index, index + 5)
          .map((order) => syncOrderTracking(supabase, order, results)),
      );
    }
  }

  let smtpConfigured = false;
  try {
    smtpConfigured = Boolean(getSmtpConfiguration());
  } catch (error) {
    console.error("Cấu hình SMTP không hợp lệ.", error);
    results.emailErrors += 1;
  }

  const staleClaim = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { error: recoveryError } = await supabase
    .from("store_order_events")
    .update({ email_status: "pending", email_claimed_at: null })
    .eq("email_status", "sending")
    .lt("email_claimed_at", staleClaim);
  if (recoveryError) {
    console.error("Không thể khôi phục thông báo email bị gián đoạn.", recoveryError);
    results.emailErrors += 1;
  }

  const { data: events, error: eventError } = await supabase
    .from("store_order_events")
    .select("id, order_id, title, description, email_attempts")
    .eq("email_status", "pending")
    .lt("email_attempts", 5)
    .order("created_at", { ascending: true })
    .limit(50);
  if (eventError) {
    console.error("Không thể tải thông báo email đang chờ.", eventError);
    return NextResponse.json(
      { error: "Không thể tải thông báo email.", results },
      { status: 500 },
    );
  }

  if (!smtpConfigured) {
    results.emailsWaitingForConfiguration = events?.length ?? 0;
  } else if (events?.length) {
    const orderIds = [...new Set(events.map((event) => event.order_id))];
    const { data: orders, error: orderError } = await supabase
      .from("store_orders")
      .select("id, order_number, customer_name, customer_email, total, shipping_tracking_url")
      .in("id", orderIds);
    if (orderError) {
      console.error("Không thể tải người nhận email đơn hàng.", orderError);
      return NextResponse.json(
        { error: "Không thể tải người nhận email đơn hàng.", results },
        { status: 500 },
      );
    }
    const ordersById = new Map(
      (orders ?? []).map((order) => [order.id, order as OrderForNotification]),
    );

    for (const event of events) {
      const { data: claimed, error: claimError } = await supabase
        .from("store_order_events")
        .update({
          email_status: "sending",
          email_claimed_at: new Date().toISOString(),
        })
        .eq("id", event.id)
        .eq("email_status", "pending")
        .select("id")
        .maybeSingle();
      if (claimError) {
        console.error(`Không thể giữ chỗ thông báo ${event.id}.`, claimError);
        results.emailErrors += 1;
        continue;
      }
      if (!claimed) continue;

      const order = ordersById.get(event.order_id);
      try {
        if (!order?.customer_email) {
          throw new Error("Đơn hàng không có email người nhận hợp lệ.");
        }
        await sendOrderNotificationEmail({
          recipient: order.customer_email,
          customerName: order.customer_name,
          orderNumber: order.order_number,
          title: event.title,
          description: event.description,
          trackingUrl: order.shipping_tracking_url,
          total: Number(order.total),
        });
        const { error: sentError } = await supabase
          .from("store_order_events")
          .update({
            email_status: "sent",
            email_sent_at: new Date().toISOString(),
            email_claimed_at: null,
            email_error: null,
            email_attempts: event.email_attempts + 1,
          })
          .eq("id", event.id)
          .eq("email_status", "sending");
        if (sentError) throw sentError;
        results.emailsSent += 1;
      } catch (error) {
        const attempts = event.email_attempts + 1;
        const { error: saveError } = await supabase
          .from("store_order_events")
          .update({
            email_status: attempts >= 5 ? "failed" : "pending",
            email_attempts: attempts,
            email_claimed_at: null,
            email_error: messageOf(error).slice(0, 500),
          })
          .eq("id", event.id)
          .eq("email_status", "sending");
        if (saveError) {
          console.error(`Không thể lưu trạng thái email đơn ${event.order_id}.`, saveError);
        }
        console.error(`Không gửi được email cập nhật đơn ${event.order_id}.`, error);
        results.emailErrors += 1;
      }
    }
  }

  const ghnConfigured = isGhnConfigured();
  const success =
    ghnConfigured &&
    smtpConfigured &&
    results.trackingErrors === 0 &&
    results.emailErrors === 0 &&
    results.emailsWaitingForConfiguration === 0;
  return NextResponse.json(
    {
    success,
    message: success
      ? "Đã đồng bộ vận đơn và xử lý email đang chờ."
      : "Đã xử lý một phần. Kiểm tra cấu hình GHN/SMTP và các lỗi được ghi nhận.",
    ghnConfigured,
    smtpConfigured,
    results,
    },
    { status: success ? 200 : 207 },
  );
}
