"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { adminLogout } from "@/app/actions/admin";
import { categories, formatPrice, products } from "@/data/products";

const categoryColors = [
  "bg-[#eef0ff] text-[#5552c7]",
  "bg-[#fff0ec] text-[#c25445]",
  "bg-[#eaf7f2] text-[#18795e]",
  "bg-[#f4f0e8] text-[#8b6735]",
];

const adminSections = [
  { id: "overview", label: "Tổng quan", icon: "◫" },
  { id: "products", label: "Sản phẩm", icon: "▦" },
  { id: "categories", label: "Danh mục", icon: "◈" },
  { id: "orders", label: "Đơn hàng", icon: "▤" },
  { id: "customers", label: "Khách hàng", icon: "♙" },
  { id: "settings", label: "Cài đặt", icon: "⚙" },
] as const;

type AdminSection = (typeof adminSections)[number]["id"];

const demoOrders = [
  { id: "NV-1048", customer: "Minh Anh", date: "30/10/2026", total: 2_180_000, status: "Chờ xác nhận" },
  { id: "NV-1047", customer: "Hoàng Nam", date: "29/10/2026", total: 1_790_000, status: "Đang giao" },
  { id: "NV-1046", customer: "Thu Hà", date: "29/10/2026", total: 890_000, status: "Hoàn thành" },
  { id: "NV-1045", customer: "Gia Bảo", date: "28/10/2026", total: 2_490_000, status: "Hoàn thành" },
];

const demoCustomers = [
  { name: "Minh Anh", email: "minhanh@example.com", orders: 5, spent: 6_450_000 },
  { name: "Hoàng Nam", email: "hoangnam@example.com", orders: 3, spent: 4_280_000 },
  { name: "Thu Hà", email: "thuha@example.com", orders: 2, spent: 1_790_000 },
  { name: "Gia Bảo", email: "giabao@example.com", orders: 4, spent: 8_120_000 },
];

export function AdminDashboard({
  email,
  preview = false,
}: {
  email: string;
  preview?: boolean;
}) {
  const [activeSection, setActiveSection] = useState<AdminSection>("overview");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Tất cả danh mục");
  const activeSectionLabel =
    adminSections.find((section) => section.id === activeSection)?.label ??
    "Tổng quan";
  const filteredProducts = useMemo(() => {
    const searchTerm = query.trim().toLocaleLowerCase("vi");
    return products.filter((product) => {
      const matchesQuery =
        !searchTerm ||
        product.name.toLocaleLowerCase("vi").includes(searchTerm) ||
        product.slug.includes(searchTerm);
      const matchesCategory =
        category === "Tất cả danh mục" || product.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [category, query]);

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
                onClick={() => setActiveSection(section.id)}
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
                {section.id === "orders" && (
                  <span className="ml-auto rounded-full bg-[#fff0ec] px-2 py-0.5 text-[10px] font-extrabold text-[#c25445]">
                    2
                  </span>
                )}
              </button>
            ))}
          </nav>
          <div className="mt-auto rounded-2xl bg-[#f0f1ff] p-4">
            <p className="text-xs font-extrabold text-navy">Chế độ xem trước</p>
            <p className="mt-2 text-xs leading-5 text-muted">
              Danh mục đang dùng dữ liệu mẫu tĩnh. Chưa có đơn hàng hoặc kho
              hàng kết nối.
            </p>
          </div>
        </aside>

        <main className="min-w-0 p-5 sm:p-8 lg:p-10">
          <header className="flex flex-col justify-between gap-5 border-b border-line pb-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.16em] text-cobalt">
                Khu vực quản trị · Nova store
              </p>
              <h1
                id="admin-page-title"
                className="mt-2 font-display text-3xl text-navy sm:text-4xl"
              >
                {activeSection === "overview"
                  ? "Tổng quan cửa hàng"
                  : activeSectionLabel}
              </h1>
              <p className="mt-2 text-sm text-muted">
                {preview
                  ? "Chế độ xem trước · Dữ liệu mẫu, chưa xác thực"
                  : `Chào mừng trở lại, ${email}`}
              </p>
            </div>
            {preview ? (
              <span className="w-fit rounded-full bg-[#fff4d8] px-4 py-2.5 text-xs font-extrabold text-[#8b6735]">
                DEMO · CHỈ XEM
              </span>
            ) : (
              <form action={adminLogout}>
                <button className="rounded-full border border-line px-4 py-2.5 text-sm font-bold text-navy transition hover:border-coral hover:text-coral">
                  Đăng xuất
                </button>
              </form>
            )}
          </header>

          {activeSection === "overview" && (
            <>
              <section
                aria-label="Thống kê cửa hàng demo"
                className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
              >
                <StatCard label="Sản phẩm" value={products.length} detail="Trong danh mục mẫu" icon="▦" />
                <StatCard label="Danh mục" value={categories.length} detail="Đang hiển thị" icon="◫" />
                <StatCard label="Đơn hàng mới" value={2} detail="Đang chờ xử lý · demo" icon="▤" />
                <StatCard label="Khách hàng" value={demoCustomers.length} detail="Tài khoản mẫu" icon="♙" />
              </section>
              <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
                <SectionHeading
                  title="Truy cập nhanh"
                  detail="Chọn một khu vực để xem giao diện quản lý"
                />
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {adminSections
                    .filter((section) => section.id !== "overview")
                    .map((section, index) => (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => setActiveSection(section.id)}
                        className="flex items-center gap-3 rounded-xl border border-line p-4 text-left transition hover:border-cobalt/40 hover:bg-[#fbfbff]"
                      >
                        <span className={`grid size-10 place-items-center rounded-xl text-sm font-bold ${categoryColors[index % categoryColors.length]}`}>
                          {section.icon}
                        </span>
                        <span>
                          <span className="block text-sm font-bold text-navy">
                            {section.label}
                          </span>
                          <span className="mt-1 block text-xs text-muted">
                            Mở trang {section.label.toLocaleLowerCase("vi")}
                          </span>
                        </span>
                      </button>
                    ))}
                </div>
              </section>
              <DemoNotice />
            </>
          )}

          {activeSection === "products" && <section className="mt-8 rounded-2xl border border-line bg-white">
            <div className="flex flex-col gap-4 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div id="catalog">
                <h2 className="text-lg font-extrabold text-navy">
                  Danh mục sản phẩm
                </h2>
                <p className="mt-1 text-xs text-muted">
                  {filteredProducts.length} sản phẩm · dữ liệu mẫu chỉ xem
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="sr-only" htmlFor="admin-product-search">
                  Tìm sản phẩm
                </label>
                <input
                  id="admin-product-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Tìm tên sản phẩm..."
                  className="h-10 min-w-0 rounded-lg border border-line px-3 text-sm outline-none focus:border-cobalt sm:w-52"
                />
                <label className="sr-only" htmlFor="admin-category-filter">
                  Lọc theo danh mục
                </label>
                <select
                  id="admin-category-filter"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="h-10 rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-cobalt"
                >
                  <option>Tất cả danh mục</option>
                  {categories.map((item) => (
                    <option key={item.name}>{item.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left">
                <thead className="bg-[#fbfbfd] text-[10px] font-extrabold uppercase tracking-[.13em] text-muted">
                  <tr>
                    <th className="px-6 py-3">Sản phẩm</th>
                    <th className="px-4 py-3">Danh mục</th>
                    <th className="px-4 py-3">Giá bán</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-6 py-3 text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredProducts.map((product) => {
                    const categoryIndex = categories.findIndex(
                      (item) => item.name === product.category,
                    );
                    return (
                      <tr key={product.id} className="transition hover:bg-[#fcfcfe]">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span
                              className={`grid size-10 shrink-0 place-items-center rounded-xl text-sm font-extrabold ${categoryColors[categoryIndex]}`}
                            >
                              {product.name.slice(0, 1)}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-bold text-navy">
                                {product.name}
                              </span>
                              <span className="mt-1 block text-xs text-muted">
                                Mã SP: NV-{String(product.id).padStart(3, "0")}
                              </span>
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-muted">
                          {product.category}
                        </td>
                        <td className="px-4 py-4 text-sm font-bold text-navy">
                          {formatPrice(product.price)}
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf7f2] px-2.5 py-1 text-[11px] font-bold text-[#18795e]">
                            <span className="size-1.5 rounded-full bg-[#20a879]" />
                            {product.isNew ? "Mới" : "Đang bán"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/products/${product.slug}`}
                            className="text-xs font-extrabold text-cobalt hover:underline"
                          >
                            Xem cửa hàng
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-sm text-muted"
                      >
                        Không tìm thấy sản phẩm phù hợp.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          }

          {activeSection === "categories" && (
            <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
              <SectionHeading
                title="Danh mục sản phẩm"
                detail={`${categories.length} danh mục · dữ liệu mẫu`}
              />
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {categories.map((item, index) => {
                  const count = products.filter(
                    (product) => product.category === item.name,
                  ).length;
                  return (
                    <article
                      key={item.name}
                      className="flex items-center gap-4 rounded-2xl border border-line p-4"
                    >
                      <span className={`grid size-12 shrink-0 place-items-center rounded-xl text-lg font-bold ${categoryColors[index]}`}>
                        {item.name.slice(0, 1)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="font-bold text-navy">{item.name}</h2>
                        <p className="mt-1 truncate text-xs text-muted">
                          {item.description}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-mist px-3 py-1 text-xs font-bold text-muted">
                        {count} SP
                      </span>
                    </article>
                  );
                })}
              </div>
              <DemoNotice />
            </section>
          )}

          {activeSection === "orders" && (
            <section className="mt-8 rounded-2xl border border-line bg-white">
              <div className="p-5 sm:p-6">
                <SectionHeading
                  title="Đơn hàng gần đây"
                  detail="Các đơn hàng dưới đây chỉ là dữ liệu minh họa"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left">
                  <thead className="bg-[#fbfbfd] text-[10px] font-extrabold uppercase tracking-[.13em] text-muted">
                    <tr>
                      <th className="px-6 py-3">Mã đơn</th>
                      <th className="px-4 py-3">Khách hàng</th>
                      <th className="px-4 py-3">Ngày đặt</th>
                      <th className="px-4 py-3">Tổng tiền</th>
                      <th className="px-6 py-3">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {demoOrders.map((order) => (
                      <tr key={order.id}>
                        <td className="px-6 py-4 text-sm font-bold text-cobalt">{order.id}</td>
                        <td className="px-4 py-4 text-sm font-semibold text-navy">{order.customer}</td>
                        <td className="px-4 py-4 text-sm text-muted">{order.date}</td>
                        <td className="px-4 py-4 text-sm font-bold text-navy">{formatPrice(order.total)}</td>
                        <td className="px-6 py-4">
                          <span className="rounded-full bg-[#f1f2ff] px-3 py-1 text-[11px] font-bold text-cobalt">{order.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 pb-5 sm:px-6"><DemoNotice /></div>
            </section>
          )}

          {activeSection === "customers" && (
            <section className="mt-8 rounded-2xl border border-line bg-white">
              <div className="p-5 sm:p-6">
                <SectionHeading
                  title="Khách hàng"
                  detail={`${demoCustomers.length} hồ sơ mẫu · thông tin không phải dữ liệu thật`}
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left">
                  <thead className="bg-[#fbfbfd] text-[10px] font-extrabold uppercase tracking-[.13em] text-muted">
                    <tr>
                      <th className="px-6 py-3">Khách hàng</th>
                      <th className="px-4 py-3">Số đơn</th>
                      <th className="px-6 py-3 text-right">Tổng chi tiêu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {demoCustomers.map((customer, index) => (
                      <tr key={customer.email}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className={`grid size-9 place-items-center rounded-full text-xs font-extrabold ${categoryColors[index % categoryColors.length]}`}>
                              {customer.name.slice(0, 1)}
                            </span>
                            <span>
                              <span className="block text-sm font-bold text-navy">{customer.name}</span>
                              <span className="mt-1 block text-xs text-muted">{customer.email}</span>
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-muted">{customer.orders}</td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-navy">{formatPrice(customer.spent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 pb-5 sm:px-6"><DemoNotice /></div>
            </section>
          )}

          {activeSection === "settings" && (
            <section className="mt-8 max-w-2xl rounded-2xl border border-line bg-white p-5 sm:p-6">
              <SectionHeading
                title="Cài đặt cửa hàng"
                detail="Bản xem trước cấu hình · chưa lưu thay đổi"
              />
              <div className="mt-6 grid gap-5">
                <label className="block text-sm font-bold text-navy">
                  Tên cửa hàng
                  <input
                    readOnly
                    value="Nova Store"
                    className="mt-2 h-11 w-full rounded-lg border border-line bg-[#fbfbfd] px-3 font-normal text-muted"
                  />
                </label>
                <label className="block text-sm font-bold text-navy">
                  Đơn vị tiền tệ
                  <input
                    readOnly
                    value="VND (đ)"
                    className="mt-2 h-11 w-full rounded-lg border border-line bg-[#fbfbfd] px-3 font-normal text-muted"
                  />
                </label>
                <label className="block text-sm font-bold text-navy">
                  Email hỗ trợ
                  <input
                    readOnly
                    value="hello@novastore.vn"
                    className="mt-2 h-11 w-full rounded-lg border border-line bg-[#fbfbfd] px-3 font-normal text-muted"
                  />
                </label>
              </div>
              <DemoNotice />
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: number;
  detail: string;
  icon: string;
}) {
  return (
    <article className="rounded-2xl border border-line bg-white p-5">
      <div className="flex items-start justify-between">
        <span className="text-xs font-bold text-muted">{label}</span>
        <span className="grid size-8 place-items-center rounded-lg bg-[#f1f2ff] text-sm font-bold text-cobalt">
          {icon}
        </span>
      </div>
      <p className="mt-5 text-3xl font-extrabold tracking-tight text-navy">
        {value}
      </p>
      <p className="mt-1 text-[11px] text-muted">{detail}</p>
    </article>
  );
}

function SectionHeading({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div>
      <h2 className="text-lg font-extrabold text-navy">{title}</h2>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </div>
  );
}

function DemoNotice() {
  return (
    <p className="mt-5 rounded-xl bg-[#f7f8fb] px-4 py-3 text-xs leading-5 text-muted">
      Dữ liệu minh họa để xem giao diện. Kết nối backend để sử dụng dữ liệu và
      thao tác thật.
    </p>
  );
}
