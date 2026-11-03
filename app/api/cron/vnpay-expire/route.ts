import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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

  const before = new Date(Date.now() - 20 * 60 * 1000).toISOString();
  const { data, error } = await supabase.rpc("expire_pending_vnpay_orders", {
    p_before: before,
    p_limit: 100,
  });
  if (error) {
    console.error("Không thể hủy các đơn VNPay hết hạn.", error);
    return NextResponse.json(
      { error: "Không thể xử lý đơn thanh toán hết hạn." },
      { status: 500 },
    );
  }
  if (typeof data !== "number" || !Number.isSafeInteger(data) || data < 0) {
    console.error("Supabase trả về kết quả dọn đơn VNPay không hợp lệ.", data);
    return NextResponse.json(
      { error: "Không nhận được kết quả xử lý đơn thanh toán." },
      { status: 500 },
    );
  }

  return NextResponse.json({ expiredOrders: data });
}
