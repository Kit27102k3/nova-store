import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

const responseHeaders = { "Cache-Control": "private, no-store" };

export async function GET() {
  if (!getSupabaseConfig()) {
    return NextResponse.json(
      { authenticated: false, productIds: [] },
      { headers: responseHeaders },
    );
  }
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError && authError.name !== "AuthSessionMissingError") {
    console.error("Không thể xác minh tài khoản khi tải yêu thích.", authError);
    return NextResponse.json(
      { error: "Không thể tải danh sách yêu thích." },
      { status: 500, headers: responseHeaders },
    );
  }
  if (!authData.user) {
    return NextResponse.json(
      { authenticated: false, productIds: [] },
      { headers: responseHeaders },
    );
  }
  const { data, error } = await supabase
    .from("store_wishlists")
    .select("product_id")
    .eq("customer_id", authData.user.id);
  if (error) {
    console.error("Không thể tải yêu thích Supabase.", error);
    return NextResponse.json(
      { error: "Không thể tải danh sách yêu thích." },
      { status: 500, headers: responseHeaders },
    );
  }
  return NextResponse.json(
    {
      authenticated: true,
      productIds: (data ?? []).map((item) => Number(item.product_id)),
    },
    { headers: responseHeaders },
  );
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json(
      { error: "Yêu cầu không hợp lệ." },
      { status: 403, headers: responseHeaders },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Dữ liệu không hợp lệ." },
      { status: 400, headers: responseHeaders },
    );
  }
  if (
    !body ||
    typeof body !== "object" ||
    !("productIds" in body) ||
    !Array.isArray(body.productIds) ||
    body.productIds.length > 500 ||
    body.productIds.some(
      (id) => typeof id !== "number" || !Number.isSafeInteger(id) || id < 1,
    )
  ) {
    return NextResponse.json(
      { error: "Danh sách yêu thích không hợp lệ." },
      { status: 400, headers: responseHeaders },
    );
  }
  if (!getSupabaseConfig()) {
    return NextResponse.json(
      { error: "Chưa cấu hình kết nối tài khoản." },
      { status: 503, headers: responseHeaders },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError && authError.name !== "AuthSessionMissingError") {
    console.error("Không thể xác minh tài khoản khi lưu yêu thích.", authError);
    return NextResponse.json(
      { error: "Không thể xác minh tài khoản." },
      { status: 500, headers: responseHeaders },
    );
  }
  if (!authData.user) {
    return NextResponse.json(
      { error: "Vui lòng đăng nhập để đồng bộ danh sách." },
      { status: 401, headers: responseHeaders },
    );
  }

  const productIds = [...new Set(body.productIds as number[])];
  const { error } = await supabase.rpc("sync_customer_wishlist", {
    p_product_ids: productIds,
  });
  if (error) {
    console.error("Không thể đồng bộ danh sách yêu thích.", error);
    return NextResponse.json(
      { error: "Không thể lưu danh sách yêu thích." },
      { status: 500, headers: responseHeaders },
    );
  }
  return NextResponse.json(
    { success: true },
    { headers: responseHeaders },
  );
}
