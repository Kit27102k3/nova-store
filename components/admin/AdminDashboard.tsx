"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type FormEvent } from "react";
import {
  deleteAdminCategory,
  deleteAdminProduct,
  saveAdminGhnOrderCode,
  saveAdminCategory,
  saveAdminProduct,
  saveAdminSettings,
  updateAdminOrderStatus,
  type AdminMutationResult,
} from "@/app/actions/admin-data";
import { adminLogout } from "@/app/actions/admin";
import { formatPrice } from "@/data/products";
import type {
  AdminCategory,
  AdminDashboardData,
  AdminOrder,
  AdminProduct,
  StoreSettings,
} from "@/lib/supabase/admin";

const adminSections = [
  { id: "overview", label: "Tổng quan", icon: "◫" },
  { id: "products", label: "Sản phẩm", icon: "▦" },
  { id: "categories", label: "Danh mục", icon: "◈" },
  { id: "orders", label: "Đơn hàng", icon: "▤" },
  { id: "customers", label: "Khách hàng", icon: "♙" },
  { id: "settings", label: "Cài đặt", icon: "⚙" },
] as const;

type AdminSection = (typeof adminSections)[number]["id"];
type Mutation = (formData: FormData) => Promise<AdminMutationResult>;

const emptySettings: StoreSettings = {
  store_name: "Nova Store",
  support_email: "hello@novastore.example",
  shipping_threshold: 499000,
  shipping_fee: 30000,
};
const emptyCategories: AdminCategory[] = [];
const emptyProducts: AdminProduct[] = [];
const emptyOrders: AdminOrder[] = [];
const emptyCustomers: AdminDashboardData["customers"] = [];
const statusLabels: Record<AdminOrder["status"], string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};
const paymentMethodLabels: Record<AdminOrder["payment_method"], string> = {
  cod: "Khi nhận hàng",
  vnpay: "VNPay",
};
const paymentStatusLabels: Record<AdminOrder["payment_status"], string> = {
  unpaid: "Chưa thanh toán",
  pending: "Chờ thanh toán",
  paid: "Đã thanh toán",
  failed: "Thất bại",
  cancelled: "Đã hủy",
};
const inputClass =
  "mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm font-normal text-navy outline-none focus:border-cobalt";
const textAreaClass =
  "mt-2 min-h-24 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm font-normal text-navy outline-none focus:border-cobalt";

export function AdminDashboard({
  email,
  data,
  loadError,
}: {
  email: string;
  data: AdminDashboardData | null;
  loadError?: string | null;
}) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<AdminSection>("overview");
  const [query, setQuery] = useState("");
  const [editingProduct, setEditingProduct] = useState<number | null>(null);
  const [editingCategory, setEditingCategory] = useState<number | null>(null);
  const [notice, setNotice] = useState<AdminMutationResult | null>(null);
  const [pending, startTransition] = useTransition();
  const dashboard = data ?? null;
  const categories = dashboard?.categories ?? emptyCategories;
  const products = dashboard?.products ?? emptyProducts;
  const orders = dashboard?.orders ?? emptyOrders;
  const customers = dashboard?.customers ?? emptyCustomers;
  const settings = dashboard?.settings ?? emptySettings;
  const activeSectionLabel =
    adminSections.find((section) => section.id === activeSection)?.label ??
    "Tổng quan";

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("vi");
    return products.filter(
      (product) =>
        !term ||
        product.name.toLocaleLowerCase("vi").includes(term) ||
        product.slug.toLocaleLowerCase("vi").includes(term),
    );
  }, [products, query]);
  const filteredOrders = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("vi");
    return orders.filter(
      (order) =>
        !term ||
        order.order_number.toLocaleLowerCase("vi").includes(term) ||
        order.customer_name.toLocaleLowerCase("vi").includes(term) ||
        order.customer_email.toLocaleLowerCase("vi").includes(term),
    );
  }, [orders, query]);
  const filteredCustomers = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("vi");
    return customers.filter(
      (customer) =>
        !term ||
        customer.name.toLocaleLowerCase("vi").includes(term) ||
        customer.email.toLocaleLowerCase("vi").includes(term),
    );
  }, [customers, query]);

  const runAction = (
    action: Mutation,
    formData: FormData,
    afterSuccess?: () => void,
  ) => {
    startTransition(async () => {
      const result = await action(formData);
      setNotice(result);
      if (result.success) {
        afterSuccess?.();
        router.refresh();
      }
    });
  };
  const runForm = (
    event: FormEvent<HTMLFormElement>,
    action: Mutation,
    afterSuccess?: () => void,
  ) => {
    event.preventDefault();
    runAction(action, new FormData(event.currentTarget), afterSuccess);
  };
  const runDelete = (
    action: Mutation,
    id: number,
    label: string,
    afterSuccess?: () => void,
  ) => {
    if (!window.confirm(`Bạn có chắc muốn xóa ${label}?`)) return;
    const formData = new FormData();
    formData.set("id", String(id));
    runAction(action, formData, afterSuccess);
  };

  const pendingOrders = orders.filter((order) => order.status === "pending").length;
  const revenue = orders
    .filter((order) => order.status === "completed")
    .reduce((sum, order) => sum + order.total, 0);

  return (
    <div className="overflow-hidden rounded-[28px] border border-line bg-white shadow-soft">
      <div className="grid min-h-[760px] lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="flex flex-col border-b border-line bg-[#fbfbfd] p-5 lg:border-r lg:border-b-0">
          <Link href="/" className="flex items-center gap-3 px-2 py-2">
            <span className="grid size-10 place-items-center rounded-xl bg-navy font-extrabold text-lime">
              N
            </span>
            <span>
              <span className="block font-extrabold tracking-[.13em] text-navy">
                NOVA
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted">
                Store admin
              </span>
            </span>
          </Link>
          <p className="mb-3 mt-9 px-3 text-[10px] font-extrabold uppercase tracking-[.18em] text-[#9a9eaa]">
            Không gian làm việc
          </p>
          <nav aria-label="Điều hướng quản trị" className="grid gap-1">
            {adminSections.map((section) => (
              <button
                key={section.id}
                type="button"
                aria-current={activeSection === section.id ? "page" : undefined}
                onClick={() => {
                  setActiveSection(section.id);
                  setQuery("");
                }}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                  activeSection === section.id
                    ? "bg-navy font-bold text-white"
                    : "text-muted hover:bg-mist hover:text-navy"
                }`}
              >
                <span aria-hidden="true" className="w-4 text-center">
                  {section.icon}
                </span>
                {section.label}
                {section.id === "orders" && pendingOrders > 0 && (
                  <span className="ml-auto rounded-full bg-[#fff0ec] px-2 py-0.5 text-[10px] font-extrabold text-[#c25445]">
                    {pendingOrders}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <div className="mt-auto rounded-2xl bg-[#f0f1ff] p-4">
            <p className="text-xs font-extrabold text-navy">Dữ liệu cửa hàng</p>
            <p className="mt-2 text-xs leading-5 text-muted">
              {`${products.length} sản phẩm · ${orders.length} đơn hàng · ${customers.length} khách hàng`}
            </p>
          </div>
        </aside>

        <main className="min-w-0 p-5 sm:p-8 lg:p-10">
          <header className="flex flex-col justify-between gap-5 border-b border-line pb-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.16em] text-cobalt">
                Khu vực quản trị · Nova store
              </p>
              <h1 className="mt-2 font-display text-3xl text-navy sm:text-4xl">
                {activeSection === "overview"
                  ? "Tổng quan cửa hàng"
                  : activeSectionLabel}
              </h1>
              <p className="mt-2 text-sm text-muted">Chào mừng trở lại, {email}</p>
            </div>
            <form action={adminLogout}>
              <button className="rounded-full border border-line px-4 py-2.5 text-sm font-bold text-navy transition hover:border-coral hover:text-coral">
                Đăng xuất
              </button>
            </form>
          </header>

          {loadError && (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-coral/40 bg-coral/10 p-4 text-sm leading-6 text-navy"
            >
              {loadError} Hãy chạy file{" "}
              <code>supabase/migrations/20261101000000_create_store_admin.sql</code>{" "}
              trong Supabase SQL Editor.
            </div>
          )}
          {notice && (
            <p
              role={notice.success ? "status" : "alert"}
              className={`mt-6 rounded-xl border p-4 text-sm ${
                notice.success
                  ? "border-[#18795e]/20 bg-[#eaf7f2] text-[#18795e]"
                  : "border-coral/40 bg-coral/10 text-navy"
              }`}
            >
              {notice.message}
            </p>
          )}

          {activeSection === "overview" && (
            <>
              <section
                aria-label="Thống kê cửa hàng"
                className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
              >
                <StatCard label="Sản phẩm" value={products.length} detail="Đang lưu trong cửa hàng" icon="▦" />
                <StatCard label="Danh mục" value={categories.length} detail="Danh mục cửa hàng" icon="◫" />
                <StatCard label="Đơn chờ xử lý" value={pendingOrders} detail="Cần xác nhận" icon="▤" />
                <StatCard label="Doanh thu hoàn tất" value={formatPrice(revenue)} detail="Đơn đã hoàn thành" icon="↗" />
              </section>
              <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
                <SectionHeading title="Truy cập nhanh" detail="Quản lý các khu vực cửa hàng" />
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {adminSections
                    .filter((section) => section.id !== "overview")
                    .map((section) => (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => setActiveSection(section.id)}
                        className="flex items-center gap-3 rounded-xl border border-line p-4 text-left transition hover:border-cobalt/40 hover:bg-[#fbfbff]"
                      >
                        <span className="grid size-10 place-items-center rounded-xl bg-[#f1f2ff] text-sm font-bold text-cobalt">
                          {section.icon}
                        </span>
                        <span className="text-sm font-bold text-navy">{section.label}</span>
                      </button>
                    ))}
                </div>
              </section>
              <section className="mt-8 rounded-2xl border border-line bg-white">
                <div className="p-5 sm:p-6">
                  <SectionHeading title="Đơn hàng gần đây" detail="Cập nhật mới nhất" />
                </div>
                <OrderTable
                  orders={orders.slice(0, 5)}
                  pending={pending}
                  runForm={runForm}
                />
              </section>
            </>
          )}

          {activeSection === "products" && (
            <section className="mt-8 space-y-5">
              <ProductEditor
                categories={categories}
                product={editingProduct === null ? null : products.find((item) => item.id === editingProduct) ?? null}
                pending={pending}
                onSubmit={(event) =>
                  runForm(event, saveAdminProduct, () => setEditingProduct(null))
                }
                onCancel={() => setEditingProduct(null)}
              />
              <div className="rounded-2xl border border-line bg-white">
                <div className="flex flex-col gap-4 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <SectionHeading
                    title="Sản phẩm"
                    detail={`${filteredProducts.length} sản phẩm trong cửa hàng`}
                  />
                  <SearchInput
                    label="Tìm sản phẩm"
                    value={query}
                    onChange={setQuery}
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left">
                    <thead className="bg-[#fbfbfd] text-[10px] font-extrabold uppercase tracking-[.13em] text-muted">
                      <tr>
                        <th className="px-6 py-3">Sản phẩm</th>
                        <th className="px-4 py-3">Danh mục</th>
                        <th className="px-4 py-3">Giá</th>
                        <th className="px-4 py-3">Tồn kho</th>
                        <th className="px-4 py-3">Trạng thái</th>
                        <th className="px-6 py-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {filteredProducts.map((product) => (
                        <tr key={product.id}>
                          <td className="px-6 py-4">
                            <span className="block text-sm font-bold text-navy">{product.name}</span>
                            <span className="mt-1 block text-xs text-muted">/{product.slug}</span>
                          </td>
                          <td className="px-4 py-4 text-sm text-muted">{product.category}</td>
                          <td className="px-4 py-4 text-sm font-bold text-navy">{formatPrice(product.price)}</td>
                          <td className="px-4 py-4 text-sm text-muted">{product.inventory}</td>
                          <td className="px-4 py-4">
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${product.isActive ? "bg-[#eaf7f2] text-[#18795e]" : "bg-[#fff0ec] text-[#c25445]"}`}>
                              {product.isActive ? "Đang bán" : "Ẩn"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-3">
                              <>
                                <button type="button" onClick={() => setEditingProduct(product.id)} className="text-xs font-extrabold text-cobalt hover:underline">Sửa</button>
                                <button type="button" disabled={pending} onClick={() => runDelete(deleteAdminProduct, product.id, `sản phẩm “${product.name}”`)} className="text-xs font-extrabold text-coral hover:underline disabled:opacity-50">Xóa</button>
                              </>
                              <Link href={`/products/${product.slug}`} className="text-xs font-extrabold text-muted hover:underline">Xem</Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredProducts.length === 0 && <EmptyRow colSpan={6} text="Chưa có sản phẩm phù hợp." />}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {activeSection === "categories" && (
            <section className="mt-8">
              <CategoryEditor
                categories={categories}
                products={products}
                category={editingCategory === null ? null : categories.find((item) => item.id === editingCategory) ?? null}
                pending={pending}
                onSubmit={(event) =>
                  runForm(event, saveAdminCategory, () => setEditingCategory(null))
                }
                onCancel={() => setEditingCategory(null)}
                onEdit={setEditingCategory}
                onDelete={(category) =>
                  runDelete(
                    deleteAdminCategory,
                    category.id,
                    `danh mục “${category.name}”`,
                  )
                }
              />
            </section>
          )}

          {activeSection === "orders" && (
            <section className="mt-8 rounded-2xl border border-line bg-white">
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <SectionHeading title="Đơn hàng" detail={`${filteredOrders.length} đơn hàng`} />
                <SearchInput label="Tìm đơn hàng hoặc khách hàng" value={query} onChange={setQuery} />
              </div>
              <OrderTable
                orders={filteredOrders}
                pending={pending}
                runForm={runForm}
              />
            </section>
          )}

          {activeSection === "customers" && (
            <section className="mt-8 rounded-2xl border border-line bg-white">
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <SectionHeading title="Khách hàng" detail={`${filteredCustomers.length} tài khoản và khách mua hàng`} />
                <SearchInput label="Tìm khách hàng" value={query} onChange={setQuery} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left">
                  <thead className="bg-[#fbfbfd] text-[10px] font-extrabold uppercase tracking-[.13em] text-muted">
                    <tr>
                      <th className="px-6 py-3">Khách hàng</th>
                      <th className="px-4 py-3">Ngày tham gia / mua</th>
                      <th className="px-4 py-3">Số đơn</th>
                      <th className="px-6 py-3 text-right">Chi tiêu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filteredCustomers.map((customer) => (
                      <tr key={customer.email}>
                        <td className="px-6 py-4">
                          <span className="block text-sm font-bold text-navy">{customer.name}</span>
                          <span className="mt-1 block text-xs text-muted">{customer.email}</span>
                        </td>
                        <td className="px-4 py-4 text-sm text-muted">{formatDate(customer.createdAt)}</td>
                        <td className="px-4 py-4 text-sm text-muted">{customer.orders}</td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-navy">{formatPrice(customer.spent)}</td>
                      </tr>
                    ))}
                    {filteredCustomers.length === 0 && <EmptyRow colSpan={4} text="Chưa có khách hàng phù hợp." />}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeSection === "settings" && (
            <section className="mt-8 max-w-2xl rounded-2xl border border-line bg-white p-5 sm:p-6">
              <SectionHeading title="Cài đặt cửa hàng" detail="Cập nhật thông tin và quy tắc vận chuyển" />
              <form onSubmit={(event) => runForm(event, saveAdminSettings)} className="mt-6 grid gap-5">
                <label className="text-sm font-bold text-navy">
                  Tên cửa hàng
                  <input name="storeName" required minLength={2} maxLength={120} defaultValue={settings.store_name} className={inputClass} disabled={pending} />
                </label>
                <label className="text-sm font-bold text-navy">
                  Email hỗ trợ
                  <input name="supportEmail" type="email" required defaultValue={settings.support_email} className={inputClass} disabled={pending} />
                </label>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="text-sm font-bold text-navy">
                    Miễn phí vận chuyển từ (đ)
                    <input name="shippingThreshold" type="number" min={0} step={1} required defaultValue={settings.shipping_threshold} className={inputClass} disabled={pending} />
                  </label>
                  <label className="text-sm font-bold text-navy">
                    Phí vận chuyển (đ)
                    <input name="shippingFee" type="number" min={0} step={1} required defaultValue={settings.shipping_fee} className={inputClass} disabled={pending} />
                  </label>
                </div>
                <button disabled={pending} className="h-11 w-fit rounded-full bg-navy px-6 text-sm font-bold text-white hover:bg-cobalt disabled:opacity-50">{pending ? "Đang lưu..." : "Lưu cài đặt"}</button>
              </form>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function ProductEditor({
  categories,
  product,
  pending,
  onSubmit,
  onCancel,
}: {
  categories: AdminCategory[];
  product: AdminProduct | null;
  pending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  const [open, setOpen] = useState(false);
  const editing = Boolean(product);
  return (
    <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHeading
          title={editing ? "Chỉnh sửa sản phẩm" : "Quản lý sản phẩm"}
          detail={editing ? product?.name ?? "" : "Tạo mới hoặc cập nhật nội dung, giá và tồn kho"}
        />
        {!editing && (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="h-10 rounded-full bg-navy px-5 text-sm font-bold text-white hover:bg-cobalt"
          >
            {open ? "Đóng biểu mẫu" : "＋ Thêm sản phẩm"}
          </button>
        )}
      </div>
      {(open || editing) && (
        <form
          key={product?.id ?? "new-product"}
          onSubmit={onSubmit}
          className="mt-6 grid gap-4 sm:grid-cols-2"
        >
          {product && <input type="hidden" name="id" value={product.id} />}
          <label className="text-sm font-bold text-navy">Tên sản phẩm<input name="name" required minLength={2} maxLength={160} defaultValue={product?.name ?? ""} className={inputClass} disabled={pending} /></label>
          <label className="text-sm font-bold text-navy">Slug<input name="slug" placeholder="Tự tạo từ tên nếu để trống" defaultValue={product?.slug ?? ""} className={inputClass} disabled={pending} /></label>
          <label className="text-sm font-bold text-navy">Danh mục<select name="categoryId" required defaultValue={product?.categoryId ?? ""} className={inputClass} disabled={pending}><option value="" disabled>Chọn danh mục</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className="text-sm font-bold text-navy">Trạng thái nhãn<select name="badge" defaultValue={product?.badge ?? ""} className={inputClass} disabled={pending}><option value="">Không có</option><option value="Mới">Mới</option><option value="Bán chạy">Bán chạy</option></select></label>
          <label className="text-sm font-bold text-navy">Giá bán (đ)<input name="price" type="number" min={0} step={1} required defaultValue={product?.price ?? ""} className={inputClass} disabled={pending} /></label>
          <label className="text-sm font-bold text-navy">Giá gốc (đ)<input name="originalPrice" type="number" min={0} step={1} defaultValue={product?.originalPrice ?? ""} className={inputClass} disabled={pending} /></label>
          <label className="text-sm font-bold text-navy">Tồn kho<input name="inventory" type="number" min={0} step={1} required defaultValue={product?.inventory ?? 0} className={inputClass} disabled={pending} /></label>
          <label className="text-sm font-bold text-navy sm:col-span-2">Ảnh sản phẩm (mỗi dòng một URL Unsplash hoặc đường dẫn /public)<textarea name="images" required defaultValue={product?.images.join("\n") ?? ""} className={textAreaClass} disabled={pending} /></label>
          <label className="text-sm font-bold text-navy sm:col-span-2">Mô tả<textarea name="description" maxLength={3000} defaultValue={product?.description ?? ""} className={textAreaClass} disabled={pending} /></label>
          <label className="text-sm font-bold text-navy">Tên lựa chọn (ví dụ: Kích cỡ)<input name="variantLabel" defaultValue={product?.variants?.label ?? ""} className={inputClass} disabled={pending} /></label>
          <label className="text-sm font-bold text-navy">Các lựa chọn (mỗi dòng một lựa chọn)<textarea name="variantOptions" defaultValue={product?.variants?.options.join("\n") ?? ""} className={textAreaClass} disabled={pending} /></label>
          <label className="text-sm font-bold text-navy sm:col-span-2">Chi tiết (mỗi dòng một ý)<textarea name="details" defaultValue={product?.details.join("\n") ?? ""} className={textAreaClass} disabled={pending} /></label>
          <div className="flex flex-wrap gap-5 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-navy"><input type="checkbox" name="isActive" defaultChecked={product?.isActive ?? true} disabled={pending} /> Đang hiển thị trên cửa hàng</label>
            <label className="flex items-center gap-2 text-sm font-semibold text-navy"><input type="checkbox" name="isNew" defaultChecked={product?.isNew ?? false} disabled={pending} /> Sản phẩm mới</label>
          </div>
          <div className="flex gap-3 sm:col-span-2">
            <button disabled={pending || categories.length === 0} className="h-11 rounded-full bg-navy px-6 text-sm font-bold text-white hover:bg-cobalt disabled:opacity-50">{pending ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Tạo sản phẩm"}</button>
            {editing && <button type="button" onClick={onCancel} className="h-11 rounded-full border border-line px-6 text-sm font-bold text-navy">Hủy</button>}
          </div>
          {categories.length === 0 && <p className="text-sm text-coral sm:col-span-2">Hãy tạo danh mục trước khi thêm sản phẩm.</p>}
        </form>
      )}
    </section>
  );
}

function CategoryEditor({
  categories,
  products,
  category,
  pending,
  onSubmit,
  onCancel,
  onEdit,
  onDelete,
}: {
  categories: AdminCategory[];
  products: AdminProduct[];
  category: AdminCategory | null;
  pending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  onEdit: (id: number) => void;
  onDelete: (category: AdminCategory) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHeading title={category ? "Chỉnh sửa danh mục" : "Danh mục sản phẩm"} detail={`${categories.length} danh mục · nội dung hiển thị trên cửa hàng`} />
        {!category && <button type="button" onClick={() => setOpen(!open)} className="h-10 rounded-full bg-navy px-5 text-sm font-bold text-white hover:bg-cobalt">{open ? "Đóng biểu mẫu" : "＋ Thêm danh mục"}</button>}
      </div>
      {(category || open) && (
        <form key={category?.id ?? "new-category"} onSubmit={onSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
          {category && <input type="hidden" name="id" value={category.id} />}
          <label className="text-sm font-bold text-navy">Tên danh mục<input name="name" required minLength={2} maxLength={80} defaultValue={category?.name ?? ""} className={inputClass} disabled={pending} /></label>
          <label className="text-sm font-bold text-navy">Slug<input name="slug" defaultValue={category?.slug ?? ""} placeholder="Tự tạo từ tên nếu để trống" className={inputClass} disabled={pending} /></label>
          <label className="text-sm font-bold text-navy sm:col-span-2">Mô tả<textarea name="description" maxLength={500} defaultValue={category?.description ?? ""} className={textAreaClass} disabled={pending} /></label>
          <label className="text-sm font-bold text-navy sm:col-span-2">Ảnh danh mục (URL)<input name="image" type="url" required defaultValue={category?.image ?? ""} className={inputClass} disabled={pending} /></label>
          <div className="flex gap-3 sm:col-span-2">
            <button disabled={pending} className="h-11 rounded-full bg-navy px-6 text-sm font-bold text-white hover:bg-cobalt disabled:opacity-50">{pending ? "Đang lưu..." : category ? "Lưu thay đổi" : "Tạo danh mục"}</button>
            {category && <button type="button" onClick={onCancel} className="h-11 rounded-full border border-line px-6 text-sm font-bold text-navy">Hủy</button>}
          </div>
        </form>
      )}
      <CategoryCards categories={categories} products={products} onEdit={onEdit} onDelete={onDelete} pending={pending} />
    </section>
  );
}

function CategoryCards({
  categories,
  products,
  onEdit,
  onDelete,
  pending,
}: {
  categories: AdminCategory[];
  products: AdminProduct[];
  onEdit?: (id: number) => void;
  onDelete?: (category: AdminCategory) => void;
  pending?: boolean;
}) {
  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      {categories.map((category) => (
        <article key={category.id} className="rounded-2xl border border-line p-4">
          <div className="flex items-start gap-4">
            <div
              role="img"
              aria-label={category.name}
              className="size-14 shrink-0 rounded-xl bg-cover bg-center"
              style={{ backgroundImage: `url("${category.image}")` }}
            />
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-navy">{category.name}</h2>
              <p className="mt-1 text-xs text-muted">{category.description || "Chưa có mô tả"}</p>
              <p className="mt-2 text-xs text-muted">{products.filter((product) => product.categoryId === category.id).length} sản phẩm</p>
            </div>
          </div>
          {onEdit && onDelete && (
            <div className="mt-4 flex gap-4 border-t border-line pt-3">
              <button type="button" onClick={() => onEdit(category.id)} className="text-xs font-bold text-cobalt hover:underline">Sửa danh mục</button>
              <button type="button" disabled={pending} onClick={() => onDelete(category)} className="text-xs font-bold text-coral hover:underline disabled:opacity-50">Xóa</button>
            </div>
          )}
        </article>
      ))}
      {categories.length === 0 && <p className="rounded-xl bg-mist p-5 text-sm text-muted sm:col-span-2">Chưa có danh mục nào. Hãy tạo danh mục đầu tiên.</p>}
    </div>
  );
}

function OrderTable({
  orders,
  pending,
  runForm,
}: {
  orders: AdminOrder[];
  pending: boolean;
  runForm: (event: FormEvent<HTMLFormElement>, action: Mutation) => void;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left">
        <thead className="bg-[#fbfbfd] text-[10px] font-extrabold uppercase tracking-[.13em] text-muted">
          <tr><th className="px-6 py-3">Mã đơn / khách</th><th className="px-4 py-3">Ngày đặt</th><th className="px-4 py-3">Tổng tiền</th><th className="px-4 py-3">Trạng thái</th><th className="px-6 py-3 text-right">Chi tiết</th></tr>
        </thead>
        <tbody className="divide-y divide-line">
          {orders.map((order) => (
            <FragmentOrderRow key={order.id} order={order} expanded={expanded === order.id} pending={pending} onToggle={() => setExpanded(expanded === order.id ? null : order.id)} onSubmit={runForm} />
          ))}
          {orders.length === 0 && <EmptyRow colSpan={5} text="Chưa có đơn hàng nào." />}
        </tbody>
      </table>
    </div>
  );
}

function FragmentOrderRow({
  order,
  expanded,
  pending,
  onToggle,
  onSubmit,
}: {
  order: AdminOrder;
  expanded: boolean;
  pending: boolean;
  onToggle: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>, action: Mutation) => void;
}) {
  return (
    <>
      <tr>
        <td className="px-6 py-4">
          <span className="block text-sm font-bold text-cobalt">{order.order_number}</span>
          <span className="mt-1 block text-xs text-navy">{order.customer_name}</span>
          <span className="mt-1 block text-xs text-muted">{order.customer_email}</span>
        </td>
        <td className="px-4 py-4 text-sm text-muted">{formatDate(order.created_at)}</td>
        <td className="px-4 py-4 text-sm font-bold text-navy">
          {formatPrice(order.total)}
          <span className="mt-1 block text-[11px] font-semibold text-muted">
            {paymentMethodLabels[order.payment_method]} ·{" "}
            {paymentStatusLabels[order.payment_status]}
          </span>
        </td>
        <td className="px-4 py-4">
          <form onSubmit={(event) => onSubmit(event, updateAdminOrderStatus)} className="flex items-center gap-2">
            <input type="hidden" name="id" value={order.id} />
            <select name="status" defaultValue={order.status} disabled={pending || ["completed", "cancelled"].includes(order.status)} aria-label={`Trạng thái đơn ${order.order_number}`} className="h-9 rounded-lg border border-line bg-white px-2 text-xs font-semibold text-navy disabled:opacity-70">
              {Object.entries(statusLabels).map(([value, label]) => (
                <option
                  key={value}
                  value={value}
                  disabled={
                    order.payment_method === "vnpay" &&
                    ((order.payment_status === "pending" &&
                      value === "cancelled") ||
                      (order.payment_status !== "paid" &&
                      ["confirmed", "shipping", "completed"].includes(value)) ||
                      (order.payment_status === "paid" && value === "cancelled"))
                  }
                >
                  {label}
                </option>
              ))}
            </select>
            {!['completed', 'cancelled'].includes(order.status) && <button disabled={pending} className="text-xs font-bold text-cobalt disabled:opacity-50">Lưu</button>}
          </form>
        </td>
        <td className="px-6 py-4 text-right">
          <button type="button" onClick={onToggle} aria-expanded={expanded} className="text-xs font-bold text-cobalt hover:underline">{expanded ? "Thu gọn" : "Chi tiết"}</button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} className="bg-[#fbfbfd] px-6 py-5">
            <div className="grid gap-5 text-sm md:grid-cols-2">
              <div>
                <h3 className="font-bold text-navy">Địa chỉ nhận hàng</h3>
                <p className="mt-2 leading-6 text-muted">
                  {order.customer_phone}
                  <br />
                  {order.address}, {order.district}, {order.city}
                </p>
                <p className="mt-3 text-xs font-semibold text-navy">
                  Thanh toán: {paymentMethodLabels[order.payment_method]} ·{" "}
                  {paymentStatusLabels[order.payment_status]}
                </p>
              </div>
              <div><h3 className="font-bold text-navy">Sản phẩm trong đơn</h3><ul className="mt-2 space-y-2">{order.items.map((item, index) => <li key={`${item.product_name}-${index}`} className="flex justify-between gap-3 text-muted"><span>{item.quantity}× {item.product_name}{item.variant ? ` · ${item.variant}` : ""}</span><span className="shrink-0">{formatPrice(item.unit_price * item.quantity)}</span></li>)}</ul><p className="mt-3 border-t border-line pt-3 text-right text-xs text-muted">Tạm tính {formatPrice(order.subtotal)} · Phí ship {formatPrice(order.shipping_fee)}</p></div>
            </div>
            <section className="mt-6 rounded-xl border border-line bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-navy">Theo dõi vận chuyển GHN</h3>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    Tạo vận đơn trên GHN, sau đó nhập mã đơn vận chuyển để đồng bộ trạng thái.
                  </p>
                  {order.shipping_status_label && (
                    <p className="mt-2 text-sm font-semibold text-cobalt">
                      {order.shipping_status_label}
                    </p>
                  )}
                  {order.shipping_tracking_url && (
                    <a
                      href={order.shipping_tracking_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-xs font-bold text-cobalt underline"
                    >
                      Mở trang tra cứu GHN
                    </a>
                  )}
                </div>
                <form
                  onSubmit={(event) => onSubmit(event, saveAdminGhnOrderCode)}
                  className="flex min-w-0 flex-wrap items-end gap-2"
                >
                  <input type="hidden" name="id" value={order.id} />
                  <label className="text-xs font-semibold text-navy">
                    Mã vận đơn GHN
                    <input
                      name="ghnOrderCode"
                      required
                      maxLength={40}
                      pattern="[A-Za-z0-9_-]+"
                      defaultValue={order.ghn_order_code ?? ""}
                      placeholder="Ví dụ: GHN..."
                      disabled={pending}
                      className="mt-1 h-9 w-48 rounded-lg border border-line bg-white px-3 text-sm font-normal outline-none focus:border-cobalt"
                    />
                  </label>
                  <button
                    disabled={pending}
                    className="h-9 rounded-lg bg-navy px-4 text-xs font-bold text-white hover:bg-cobalt disabled:opacity-50"
                  >
                    {pending ? "Đang lưu..." : "Lưu mã"}
                  </button>
                </form>
              </div>
            </section>
          </td>
        </tr>
      )}
    </>
  );
}

function SearchInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={label} className="h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-cobalt sm:w-64" />
    </label>
  );
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return <tr><td colSpan={colSpan} className="px-6 py-12 text-center text-sm text-muted">{text}</td></tr>;
}

function StatCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: string;
}) {
  return (
    <article className="rounded-2xl border border-line bg-white p-5">
      <div className="flex items-start justify-between">
        <span className="text-xs font-bold text-muted">{label}</span>
        <span className="grid size-8 place-items-center rounded-lg bg-[#f1f2ff] text-sm font-bold text-cobalt">{icon}</span>
      </div>
      <p className="mt-5 truncate text-3xl font-extrabold tracking-tight text-navy">{value}</p>
      <p className="mt-1 text-[11px] text-muted">{detail}</p>
    </article>
  );
}

function SectionHeading({ title, detail }: { title: string; detail: string }) {
  return <div><h2 className="text-lg font-extrabold text-navy">{title}</h2><p className="mt-1 text-xs text-muted">{detail}</p></div>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
  }).format(new Date(value));
}
