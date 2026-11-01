import Link from "next/link";

export function Footer() {
  const columns: [string, [string, string][]][] = [
    ["Khám phá", [["Tất cả sản phẩm", "/products"], ["Danh mục", "/categories"], ["Lookbook", "/lookbook"], ["Tạp chí", "/journal"]]],
    ["Hỗ trợ", [["Câu hỏi thường gặp", "/faq"], ["Giao hàng", "/shipping"], ["Đổi trả", "/returns"], ["Bảng size", "/size-guide"], ["Liên hệ", "/contact"]]],
    ["Tài khoản", [["Tài khoản", "/account"], ["Đơn hàng", "/account/orders"], ["Địa chỉ", "/account/addresses"], ["Điều khoản", "/terms"], ["Bảo mật", "/privacy"]]],
  ];
  return <footer className="border-t border-line bg-navy text-white"><div className="container-shell grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]"><div><Link href="/" className="font-display text-2xl font-bold tracking-[0.18em]">NOVA STORE</Link><p className="mt-5 max-w-sm text-sm leading-7 text-white/65">Những lựa chọn tối giản và tinh tế, được tuyển chọn cho nhịp sống hiện đại.</p><p className="mt-4 text-xs text-white/40">Địa chỉ cửa hàng mẫu — dữ liệu cần thay thế.</p></div>{columns.map(([title, items]) => <div key={title}><h2 className="text-sm font-semibold">{title}</h2><ul className="mt-5 space-y-3 text-sm text-white/65">{items.map(([label, href]) => <li key={label}><Link className="hover:text-white" href={href}>{label}</Link></li>)}</ul></div>)}</div><div className="border-t border-white/10"><div className="container-shell flex flex-col gap-2 py-5 text-xs text-white/45 sm:flex-row sm:justify-between"><p>© 2026 Nova Store. Mọi quyền được bảo lưu.</p><p>Thông tin liên hệ chỉ là dữ liệu minh họa.</p></div></div></footer>;
}
