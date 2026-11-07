import "server-only";

import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { categories as sampleCategories, products as sampleProducts } from "@/data/products";
import type { Category, Product } from "@/types/product";
import { getSupabaseConfig } from "@/lib/supabase/config";

export type StoreCategory = {
  id: number;
  name: string;
  slug: string;
  description: string;
  image: string;
};

export type StoreSettings = {
  storeName: string;
  supportEmail: string;
  shippingThreshold: number;
  shippingFee: number;
};

export type StoreCatalog = {
  categories: StoreCategory[];
  products: Product[];
  settings: StoreSettings;
};

const defaultSettings: StoreSettings = {
  storeName: "Nova Store",
  supportEmail: "hello@novastore.example",
  shippingThreshold: 499000,
  shippingFee: 30000,
};

function getSampleCatalog(): StoreCatalog {
  return {
    categories: sampleCategories.map((category, index) => ({
      id: index + 1,
      ...category,
      slug: ["thoi-trang", "phu-kien", "cong-nghe", "doi-song"][index],
    })),
    products: sampleProducts.map((product) => ({
      ...product,
      inventory: 20,
      variants: product.variants
        ? {
            ...product.variants,
            inventory: Object.fromEntries(
              product.variants.options.map((option) => [option, 5]),
            ),
          }
        : undefined,
    })),
    settings: defaultSettings,
  };
}

export async function getStoreCatalog(): Promise<StoreCatalog> {
  "use cache";
  cacheLife("hours");
  cacheTag("store-catalog");

  const config = getSupabaseConfig();
  if (!config) {
    return getSampleCatalog();
  }

  const supabase = createClient(config.url, config.key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  const [categoryResult, productResult, settingsResult] = await Promise.all([
    supabase.from("store_categories").select("*").order("name"),
    supabase
      .from("store_products")
      .select("id, slug, name, category_id, price, original_price, rating, reviews, badge, is_new, inventory, images, description, details, variants, category:store_categories(name)")
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
    supabase.from("store_settings").select("*").eq("id", "store").maybeSingle(),
  ]);
  const queryError =
    categoryResult.error ?? productResult.error ?? settingsResult.error;
  if (queryError) {
    unstable_rethrow(queryError);
    console.error("Không thể tải danh mục cửa hàng từ Supabase.", {
      code: queryError.code,
      message: queryError.message,
      hint: queryError.hint,
    });
    if (queryError.code === "42P01" || queryError.code === "PGRST205") {
      return getSampleCatalog();
    }
    if (
      queryError.code === "42501" &&
      queryError.message.includes("store_products")
    ) {
      throw new Error(
        "Supabase không cho phép đọc dữ liệu sản phẩm. Hãy chạy migration 20261105000000_customer_storefront_features.sql trong SQL Editor, sau đó khởi động lại ứng dụng.",
      );
    }
    throw new Error(
      "Không thể tải cửa hàng. Hãy kiểm tra kết nối và chạy migration Supabase mới nhất.",
    );
  }

  const categoryRows = categoryResult.data ?? [];
  const products: Product[] = (productResult.data ?? []).map((row) => {
    const category = Array.isArray(row.category) ? row.category[0] : row.category;
    return {
      id: Number(row.id),
      slug: row.slug,
      name: row.name,
      category: (category?.name ?? "") as Category,
      price: Number(row.price),
      originalPrice: row.original_price === null ? undefined : Number(row.original_price),
      rating: Number(row.rating),
      reviews: Number(row.reviews),
      inventory: Number(row.inventory),
      badge: row.badge ?? undefined,
      isNew: row.is_new,
      images: row.images,
      description: row.description,
      details: row.details,
      variants: row.variants
        ? {
            label: row.variants.label,
            options: row.variants.options,
            inventory: row.variants.stock ?? undefined,
          }
        : undefined,
    };
  });

  return {
    categories: categoryRows.map((row) => ({
      id: Number(row.id),
      name: row.name,
      slug: row.slug,
      description: row.description,
      image: row.image,
    })),
    products,
    settings: settingsResult.data
      ? {
          storeName: settingsResult.data.store_name,
          supportEmail: settingsResult.data.support_email,
          shippingThreshold: Number(settingsResult.data.shipping_threshold),
          shippingFee: Number(settingsResult.data.shipping_fee),
        }
      : defaultSettings,
  };
}
