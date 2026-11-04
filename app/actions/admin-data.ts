"use server";

import { revalidatePath, updateTag } from "next/cache";
import {
  createSupabaseAdminClient,
  verifyAdminSession,
} from "@/lib/supabase/admin";
import { getGhnTrackingUrl } from "@/lib/shipping/ghn";

export type AdminMutationResult = {
  success: boolean;
  message: string;
};

function field(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function validProductImage(value: string) {
  if (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
  ) {
    return true;
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "images.unsplash.com";
  } catch {
    return false;
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function getAdminClient() {
  const session = await verifyAdminSession();
  if (!session.authorized) {
    return { client: null, error: session.error };
  }
  const client = createSupabaseAdminClient();
  if (!client) {
    return {
      client: null,
      error: "Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY trên máy chủ.",
    };
  }
  return { client, error: null };
}

function revalidateStorefront(slug?: string) {
  updateTag("store-catalog");
  for (const path of [
    "/",
    "/products",
    "/categories",
    "/categories/[slug]",
    "/products/[slug]",
    "/cart",
    "/checkout",
    "/admin",
  ]) {
    revalidatePath(
      path,
      path.includes("[slug]") ? "page" : undefined,
    );
  }
  if (slug) revalidatePath(`/products/${slug}`);
}

function failed(message: string): AdminMutationResult {
  return { success: false, message };
}

function succeeded(message: string): AdminMutationResult {
  return { success: true, message };
}

export async function saveAdminProduct(
  formData: FormData,
): Promise<AdminMutationResult> {
  const name = field(formData, "name");
  const slug = slugify(field(formData, "slug") || name);
  const categoryId = Number(field(formData, "categoryId"));
  const price = Number(field(formData, "price"));
  const originalPriceValue = field(formData, "originalPrice");
  const originalPrice = originalPriceValue ? Number(originalPriceValue) : null;
  const inventory = Number(field(formData, "inventory"));
  const images = field(formData, "images")
    .split(/\r?\n/)
    .map((image) => image.trim())
    .filter(Boolean);
  const details = field(formData, "details")
    .split(/\r?\n/)
    .map((detail) => detail.trim())
    .filter(Boolean);
  const variantLabel = field(formData, "variantLabel");
  const variantOptions = field(formData, "variantOptions")
    .split(/\r?\n/)
    .map((option) => option.trim())
    .filter(Boolean);
  const description = field(formData, "description");
  const idValue = field(formData, "id");
  const id = idValue ? Number(idValue) : undefined;

  if (
    name.length < 2 ||
    name.length > 160 ||
    !slug ||
    slug.length > 180 ||
    !Number.isSafeInteger(categoryId) ||
    !Number.isSafeInteger(price) ||
    price < 0 ||
    (originalPrice !== null &&
      (!Number.isSafeInteger(originalPrice) || originalPrice < price)) ||
    !Number.isSafeInteger(inventory) ||
    inventory < 0 ||
    images.length === 0 ||
    images.length > 10 ||
    images.some((image) => image.length > 2048 || !validProductImage(image)) ||
    description.length > 3000 ||
    details.length > 30 ||
    details.some((detail) => detail.length > 500) ||
    variantLabel.length > 80 ||
    variantOptions.length > 50 ||
    variantOptions.some((option) => option.length > 120) ||
    (id !== undefined && (!Number.isSafeInteger(id) || id < 1))
  ) {
    return failed("Vui lòng kiểm tra tên, danh mục, giá, tồn kho và ảnh sản phẩm.");
  }

  const { client, error: authorizationError } = await getAdminClient();
  if (!client) return failed(authorizationError ?? "Không thể xác thực quản trị viên.");

  const { data: category, error: categoryError } = await client
    .from("store_categories")
    .select("id")
    .eq("id", categoryId)
    .maybeSingle();
  if (categoryError) {
    console.error("Không thể xác minh danh mục sản phẩm.", categoryError);
    return failed("Không thể xác minh danh mục sản phẩm.");
  }
  if (!category) return failed("Danh mục đã chọn không tồn tại.");

  const badgeValue = field(formData, "badge");
  const variants =
    variantLabel && variantOptions.length
      ? { label: variantLabel, options: variantOptions }
      : null;
  const record = {
    ...(id ? { id } : {}),
    name,
    slug,
    category_id: categoryId,
    price,
    original_price: originalPrice,
    inventory,
    images,
    description,
    details,
    variants,
    badge: badgeValue || null,
    is_new: formData.get("isNew") === "on",
    is_active: formData.get("isActive") === "on",
    updated_at: new Date().toISOString(),
  };
  const { error } = await client.from("store_products").upsert(record);
  if (error) {
    console.error("Không thể lưu sản phẩm quản trị.", error);
    return failed(
      error.code === "23505"
        ? "Tên đường dẫn sản phẩm đã được sử dụng."
        : "Không thể lưu sản phẩm. Hãy kiểm tra dữ liệu và thử lại.",
    );
  }

  revalidateStorefront(slug);
  return succeeded(id ? "Đã cập nhật sản phẩm." : "Đã tạo sản phẩm mới.");
}

export async function deleteAdminProduct(
  formData: FormData,
): Promise<AdminMutationResult> {
  const id = Number(field(formData, "id"));
  if (!Number.isSafeInteger(id) || id < 1) return failed("Sản phẩm không hợp lệ.");
  const { client, error: authorizationError } = await getAdminClient();
  if (!client) return failed(authorizationError ?? "Không thể xác thực quản trị viên.");
  const { error } = await client.from("store_products").delete().eq("id", id);
  if (error) {
    console.error("Không thể xóa sản phẩm quản trị.", error);
    return failed("Không thể xóa sản phẩm. Hãy thử lại.");
  }
  revalidateStorefront();
  return succeeded("Đã xóa sản phẩm.");
}

export async function saveAdminCategory(
  formData: FormData,
): Promise<AdminMutationResult> {
  const idValue = field(formData, "id");
  const id = idValue ? Number(idValue) : undefined;
  const name = field(formData, "name");
  const slug = slugify(field(formData, "slug") || name);
  const description = field(formData, "description");
  const image = field(formData, "image");
  if (
    name.length < 2 ||
    name.length > 80 ||
    !slug ||
    description.length > 500 ||
    !/^(https:\/\/|\/(?!\/))/i.test(image) ||
    (id !== undefined && (!Number.isSafeInteger(id) || id < 1))
  ) {
    return failed("Vui lòng kiểm tra tên, đường dẫn và ảnh danh mục.");
  }

  const { client, error: authorizationError } = await getAdminClient();
  if (!client) return failed(authorizationError ?? "Không thể xác thực quản trị viên.");
  const { error } = await client.from("store_categories").upsert({
    ...(id ? { id } : {}),
    name,
    slug,
    description,
    image,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error("Không thể lưu danh mục quản trị.", error);
    return failed(
      error.code === "23505"
        ? "Tên hoặc đường dẫn danh mục đã được sử dụng."
        : "Không thể lưu danh mục. Danh mục đang được sản phẩm sử dụng?",
    );
  }
  revalidateStorefront();
  return succeeded(id ? "Đã cập nhật danh mục." : "Đã tạo danh mục.");
}

export async function deleteAdminCategory(
  formData: FormData,
): Promise<AdminMutationResult> {
  const id = Number(field(formData, "id"));
  if (!Number.isSafeInteger(id) || id < 1) return failed("Danh mục không hợp lệ.");
  const { client, error: authorizationError } = await getAdminClient();
  if (!client) return failed(authorizationError ?? "Không thể xác thực quản trị viên.");
  const { error } = await client.from("store_categories").delete().eq("id", id);
  if (error) {
    console.error("Không thể xóa danh mục quản trị.", error);
    return failed(
      error.code === "23503"
        ? "Không thể xóa danh mục đang có sản phẩm. Hãy chuyển hoặc xóa sản phẩm trước."
        : "Không thể xóa danh mục. Hãy thử lại.",
    );
  }
  revalidateStorefront();
  return succeeded("Đã xóa danh mục.");
}

export async function updateAdminOrderStatus(
  formData: FormData,
): Promise<AdminMutationResult> {
  const id = Number(field(formData, "id"));
  const status = field(formData, "status");
  if (
    !Number.isSafeInteger(id) ||
    id < 1 ||
    !["pending", "confirmed", "shipping", "completed", "cancelled"].includes(status)
  ) {
    return failed("Mã đơn hoặc trạng thái không hợp lệ.");
  }
  const { client, error: authorizationError } = await getAdminClient();
  if (!client) return failed(authorizationError ?? "Không thể xác thực quản trị viên.");
  const { error } = await client.rpc("admin_set_order_status", {
    p_order_id: id,
    p_status: status,
  });
  if (error) {
    console.error("Không thể cập nhật trạng thái đơn hàng.", error);
    return failed(error.message || "Không thể cập nhật trạng thái đơn hàng.");
  }
  revalidatePath("/admin");
  return succeeded("Đã cập nhật trạng thái đơn hàng.");
}

export async function saveAdminGhnOrderCode(
  formData: FormData,
): Promise<AdminMutationResult> {
  const id = Number(field(formData, "id"));
  const orderCode = field(formData, "ghnOrderCode").toUpperCase();
  if (
    !Number.isSafeInteger(id) ||
    id < 1 ||
    !/^[A-Z0-9_-]{1,40}$/.test(orderCode)
  ) {
    return failed("Mã vận đơn GHN không hợp lệ.");
  }
  const { client, error: authorizationError } = await getAdminClient();
  if (!client) {
    return failed(authorizationError ?? "Không thể xác thực quản trị viên.");
  }
  const { data, error } = await client
    .from("store_orders")
    .update({
      ghn_order_code: orderCode,
      shipping_tracking_url: getGhnTrackingUrl(orderCode),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("Không thể lưu mã vận đơn GHN.", error);
    return failed("Không thể lưu mã vận đơn. Hãy kiểm tra migration mới nhất.");
  }
  revalidatePath("/admin");
  revalidatePath("/account/orders");
  return succeeded("Đã lưu mã vận đơn GHN.");
}

export async function saveAdminSettings(
  formData: FormData,
): Promise<AdminMutationResult> {
  const storeName = field(formData, "storeName");
  const supportEmail = field(formData, "supportEmail").toLowerCase();
  const shippingThreshold = Number(field(formData, "shippingThreshold"));
  const shippingFee = Number(field(formData, "shippingFee"));
  if (
    storeName.length < 2 ||
    storeName.length > 120 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail) ||
    !Number.isSafeInteger(shippingThreshold) ||
    shippingThreshold < 0 ||
    !Number.isSafeInteger(shippingFee) ||
    shippingFee < 0
  ) {
    return failed("Vui lòng kiểm tra tên cửa hàng, email và phí vận chuyển.");
  }
  const { client, error: authorizationError } = await getAdminClient();
  if (!client) return failed(authorizationError ?? "Không thể xác thực quản trị viên.");
  const { error } = await client.from("store_settings").upsert({
    id: "store",
    store_name: storeName,
    support_email: supportEmail,
    shipping_threshold: shippingThreshold,
    shipping_fee: shippingFee,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error("Không thể lưu cài đặt cửa hàng.", error);
    return failed("Không thể lưu cài đặt cửa hàng.");
  }
  revalidateStorefront();
  return succeeded("Đã lưu cài đặt cửa hàng.");
}

export async function saveAdminVoucher(
  formData: FormData,
): Promise<AdminMutationResult> {
  const id = field(formData, "id");
  const code = field(formData, "code").toUpperCase();
  const discountType = field(formData, "discountType");
  const discountValue = Number(field(formData, "discountValue"));
  const minSubtotal = Number(field(formData, "minSubtotal"));
  const maxDiscountValue = field(formData, "maxDiscount");
  const usageLimitValue = field(formData, "usageLimit");
  const maxDiscount = maxDiscountValue ? Number(maxDiscountValue) : null;
  const usageLimit = usageLimitValue ? Number(usageLimitValue) : null;
  const startsAtValue = field(formData, "startsAt");
  const expiresAtValue = field(formData, "expiresAt");
  const startsAt = startsAtValue ? new Date(startsAtValue) : null;
  const expiresAt = expiresAtValue ? new Date(expiresAtValue) : null;

  if (
    (id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) ||
    !/^[A-Z0-9_-]{3,40}$/.test(code) ||
    !["percent", "fixed"].includes(discountType) ||
    !Number.isSafeInteger(discountValue) ||
    discountValue < 1 ||
    discountValue > (discountType === "percent" ? 100 : 2147483647) ||
    !Number.isSafeInteger(minSubtotal) ||
    minSubtotal < 0 ||
    (maxDiscount !== null &&
      (!Number.isSafeInteger(maxDiscount) || maxDiscount < 1)) ||
    (usageLimit !== null &&
      (!Number.isSafeInteger(usageLimit) || usageLimit < 1)) ||
    (startsAt !== null && !Number.isFinite(startsAt.getTime())) ||
    (expiresAt !== null && !Number.isFinite(expiresAt.getTime())) ||
    (startsAt !== null &&
      expiresAt !== null &&
      expiresAt.getTime() <= startsAt.getTime())
  ) {
    return failed("Vui lòng kiểm tra mã, mức giảm, giới hạn và thời hạn voucher.");
  }

  const { client, error: authorizationError } = await getAdminClient();
  if (!client) {
    return failed(authorizationError ?? "Không thể xác thực quản trị viên.");
  }
  const { error } = await client.from("store_vouchers").upsert({
    ...(id ? { id } : {}),
    code,
    discount_type: discountType,
    discount_value: discountValue,
    min_subtotal: minSubtotal,
    max_discount: maxDiscount,
    starts_at: startsAt?.toISOString() ?? null,
    expires_at: expiresAt?.toISOString() ?? null,
    usage_limit: usageLimit,
    is_active: formData.get("isActive") === "on",
  });
  if (error) {
    console.error("Không thể lưu voucher quản trị.", error);
    return failed(
      error.code === "23505"
        ? "Mã voucher đã tồn tại."
        : "Không thể lưu voucher. Hãy kiểm tra migration Supabase mới nhất.",
    );
  }

  revalidatePath("/admin");
  revalidatePath("/checkout");
  return succeeded(id ? "Đã cập nhật voucher." : "Đã tạo voucher.");
}
