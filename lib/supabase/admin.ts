import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Category, Product } from "@/types/product";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import type { AdminVoucher } from "@/lib/vouchers";

export type AdminCategory = {
  id: number;
  name: string;
  slug: string;
  description: string;
  image: string;
};

export type AdminProduct = Product & {
  categoryId: number;
  inventory: number;
  isActive: boolean;
};

export type AdminOrderItem = {
  product_name: string;
  variant: string | null;
  unit_price: number;
  quantity: number;
};

export type AdminOrder = {
  id: number;
  order_number: string;
  customer_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  address: string;
  district: string;
  city: string;
  status: "pending" | "confirmed" | "shipping" | "completed" | "cancelled";
  payment_method: "cod" | "vnpay";
  payment_status: "unpaid" | "pending" | "paid" | "failed" | "cancelled";
  subtotal: number;
  shipping_fee: number;
  voucher_code: string | null;
  discount_amount: number;
  total: number;
  created_at: string;
  ghn_order_code: string | null;
  shipping_status: string | null;
  shipping_status_label: string | null;
  shipping_tracking_url: string | null;
  items: AdminOrderItem[];
};

export type AdminCustomer = {
  id: string;
  name: string;
  email: string;
  orders: number;
  spent: number;
  createdAt: string;
};

export type StoreSettings = {
  store_name: string;
  support_email: string;
  shipping_threshold: number;
  shipping_fee: number;
};

export type AdminDashboardData = {
  categories: AdminCategory[];
  products: AdminProduct[];
  orders: AdminOrder[];
  customers: AdminCustomer[];
  customerLoadError: string | null;
  vouchers: AdminVoucher[];
  voucherLoadError: string | null;
  settings: StoreSettings;
};

export type AdminDashboardResult =
  | { data: AdminDashboardData; error: null }
  | { data: null; error: string };

export function createSupabaseAdminClient() {
  const config = getSupabaseConfig();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!config || !serviceKey) return null;

  return createClient(config.url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export async function verifyAdminSession() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";
  if (!adminEmail) return { authorized: false, error: "Chưa cấu hình ADMIN_EMAIL." };
  if (!getSupabaseConfig()) {
    return { authorized: false, error: "Chưa cấu hình kết nối Supabase." };
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error && error.name !== "AuthSessionMissingError") {
    console.error("Không thể xác minh phiên quản trị Supabase.", error);
    return { authorized: false, error: "Không thể xác minh phiên quản trị." };
  }
  if (data.user?.email?.toLowerCase() !== adminEmail) {
    return { authorized: false, error: "Bạn không có quyền thực hiện thao tác này." };
  }
  return { authorized: true as const, user: data.user };
}

export async function loadAdminDashboardData(): Promise<AdminDashboardResult> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return {
      data: null,
      error:
        "Hãy cấu hình SUPABASE_SERVICE_ROLE_KEY trên máy chủ để bật dữ liệu quản trị.",
    };
  }

  const [categoryResult, productResult, orderResult, settingsResult, voucherResult] =
    await Promise.all([
      supabase.from("store_categories").select("*").order("name"),
      supabase
        .from("store_products")
        .select("*, category:store_categories(id, name)")
        .order("created_at", { ascending: false }),
      supabase
        .from("store_orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase.from("store_settings").select("*").eq("id", "store").single(),
      supabase
        .from("store_vouchers")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

  const queryError =
    categoryResult.error ??
    productResult.error ??
    orderResult.error ??
    settingsResult.error;
  if (queryError) {
    console.error("Không thể tải dữ liệu quản trị từ Supabase.", queryError);
    return {
      data: null,
      error:
        "Không thể tải dữ liệu quản trị. Hãy kiểm tra và chạy migration Supabase mới nhất.",
    };
  }
  const voucherLoadError = voucherResult.error
    ? "Không thể tải voucher. Hãy chạy migration voucher mới nhất trong Supabase."
    : null;
  if (voucherResult.error) {
    console.warn("Không thể tải danh sách voucher quản trị.", voucherResult.error);
  }

  const categories: AdminCategory[] = (categoryResult.data ?? []).map((row) => ({
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    description: row.description,
    image: row.image,
  }));
  const products: AdminProduct[] = (productResult.data ?? []).map((row) => {
    const category = Array.isArray(row.category) ? row.category[0] : row.category;
    return {
      id: Number(row.id),
      slug: row.slug,
      name: row.name,
      category: (category?.name ?? "") as Category,
      categoryId: Number(row.category_id),
      price: Number(row.price),
      originalPrice: row.original_price === null ? undefined : Number(row.original_price),
      rating: Number(row.rating),
      reviews: Number(row.reviews),
      badge: row.badge ?? undefined,
      isNew: row.is_new,
      isActive: row.is_active,
      inventory: Number(row.inventory),
      images: row.images,
      description: row.description,
      details: row.details,
      variants: row.variants ?? undefined,
    };
  });
  const orders: AdminOrder[] = (orderResult.data ?? []).map((row) => ({
    id: Number(row.id),
    order_number: row.order_number,
    customer_id: row.customer_id,
    customer_name: row.customer_name,
    customer_email: row.customer_email,
    customer_phone: row.customer_phone,
    address: row.address,
    district: row.district,
    city: row.city,
    status: row.status,
    payment_method: row.payment_method === "vnpay" ? "vnpay" : "cod",
    payment_status: row.payment_status ?? "unpaid",
    subtotal: Number(row.subtotal),
    shipping_fee: Number(row.shipping_fee),
    voucher_code: row.voucher_code ?? null,
    discount_amount: Number(row.discount_amount ?? 0),
    total: Number(row.total),
    created_at: row.created_at,
    ghn_order_code: row.ghn_order_code ?? null,
    shipping_status: row.shipping_status ?? null,
    shipping_status_label: row.shipping_status_label ?? null,
    shipping_tracking_url: row.shipping_tracking_url ?? null,
    items: [],
  }));

  const vouchers: AdminVoucher[] = (voucherResult.data ?? []).map((row) => ({
    id: row.id,
    code: row.code,
    discount_type: row.discount_type,
    discount_value: Number(row.discount_value),
    min_subtotal: Number(row.min_subtotal),
    max_discount: row.max_discount === null ? null : Number(row.max_discount),
    starts_at: row.starts_at,
    expires_at: row.expires_at,
    usage_limit: row.usage_limit === null ? null : Number(row.usage_limit),
    used_count: Number(row.used_count),
    is_active: row.is_active,
  }));

  if (orders.length) {
    const { data: itemRows, error } = await supabase
      .from("store_order_items")
      .select("order_id, product_name, variant, unit_price, quantity")
      .in("order_id", orders.map((order) => order.id));
    if (error) {
      console.error("Không thể tải chi tiết sản phẩm trong đơn hàng.", error);
      return { data: null, error: "Không thể tải chi tiết đơn hàng." };
    }
    for (const order of orders) {
      order.items = itemRows
        .filter((item) => Number(item.order_id) === order.id)
        .map((item) => ({
          product_name: item.product_name,
          variant: item.variant,
          unit_price: Number(item.unit_price),
          quantity: Number(item.quantity),
        }));
    }

  }

  const customersByEmail = new Map<string, AdminCustomer>();
  const orderTotals = new Map<string, { orders: number; spent: number }>();
  for (const order of orders) {
    const email = order.customer_email.toLowerCase();
    const totals = orderTotals.get(email) ?? { orders: 0, spent: 0 };
    totals.orders += 1;
    if (order.status === "completed") totals.spent += order.total;
    orderTotals.set(email, totals);
    if (!customersByEmail.has(email)) {
      customersByEmail.set(email, {
        id: order.customer_id ?? email,
        name: order.customer_name,
        email,
        orders: 0,
        spent: 0,
        createdAt: order.created_at,
      });
    }
  }

  let customerLoadError: string | null = null;
  const authCustomers: AdminCustomer[] = [];
  try {
    let page = 1;
    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({
        page,
        perPage: 100,
      });
      if (error) {
        console.warn("Không thể tải danh sách khách hàng Supabase Auth.", error);
        customerLoadError =
          "Supabase Auth chưa trả được danh sách tài khoản. Đang hiển thị khách hàng có đơn hàng; hãy kiểm tra mục Authentication → Users trong Supabase.";
        break;
      }
      for (const user of data.users) {
        if (!user.email) continue;
        const email = user.email.toLowerCase();
        const totals = orderTotals.get(email) ?? { orders: 0, spent: 0 };
        authCustomers.push({
          id: user.id,
          name:
            (typeof user.user_metadata.full_name === "string" &&
              user.user_metadata.full_name) ||
            customersByEmail.get(email)?.name ||
            "Khách hàng",
          email,
          orders: totals.orders,
          spent: totals.spent,
          createdAt: user.created_at,
        });
      }
      if (data.users.length < 100) break;
      page += 1;
    }
  } catch (error) {
    console.warn("Không thể tải danh sách khách hàng Supabase Auth.", error);
    customerLoadError =
      "Supabase Auth chưa trả được danh sách tài khoản. Đang hiển thị khách hàng có đơn hàng; hãy kiểm tra mục Authentication → Users trong Supabase.";
  }
  for (const customer of authCustomers) {
    customersByEmail.set(customer.email, customer);
  }

  return {
    data: {
      categories,
      products,
      orders,
      customers: [...customersByEmail.values()].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      ),
      customerLoadError,
      vouchers,
      voucherLoadError,
      settings: {
        store_name: settingsResult.data.store_name,
        support_email: settingsResult.data.support_email,
        shipping_threshold: Number(settingsResult.data.shipping_threshold),
        shipping_fee: Number(settingsResult.data.shipping_fee),
      },
    },
    error: null,
  };
}
