import Link from "next/link";
import type { StoreSettings } from "@/lib/supabase/catalog";

export function Footer({ settings }: { settings: StoreSettings }) {
  const columns: [string, [string, string][]][] = [
    ["Khám phá", [["Tất cả sản phẩm", "/products"], ["Danh mục", "/categories"], ["Lookbook", "/lookbook"], ["Tạp chí", "/journal"]]],
    ["Hỗ trợ", [["Câu hỏi thường gặp", "/faq"], ["Giao hàng", "/shipping"], ["Đổi trả", "/returns"], ["Bảng size", "/size-guide"], ["Liên hệ", "/contact"]]],
    ["Tài khoản", [["Tài khoản", "/account"], ["Đơn hàng", "/account/orders"], ["Tra cứu đơn khách", "/track-order"], ["Địa chỉ", "/account/addresses"], ["Điều khoản", "/terms"], ["Bảo mật", "/privacy"]]],
  ];
  return <footer className="border-t border-line bg-navy text-white"><div className="container-shell grid grid-cols-2 gap-x-5 gap-y-8 py-10 sm:gap-10 sm:py-14 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]"><div className="col-span-2 lg:col-span-1"><Link href="/" className="font-display text-2xl font-bold tracking-[0.18em]">{settings.storeName.toUpperCase()}</Link><p className="mt-3 max-w-sm text-sm leading-6 text-white/65 sm:mt-5 sm:leading-7">Những lựa chọn tối giản và tinh tế, được tuyển chọn cho nhịp sống hiện đại.</p><a className="mt-3 inline-block break-all text-sm text-white/65 hover:text-white sm:mt-4" href={`mailto:${settings.supportEmail}`}>{settings.supportEmail}</a></div>{columns.map(([title, items]) => <div key={title}><h2 className="text-sm font-semibold">{title}</h2><ul className="mt-3 space-y-2.5 text-xs text-white/65 sm:mt-5 sm:space-y-3 sm:text-sm">{items.map(([label, href]) => <li key={label}><Link className="hover:text-white" href={href}>{label}</Link></li>)}</ul></div>)}</div><div className="border-t border-white/10"><div className="container-shell flex flex-col gap-2 py-4 text-[11px] text-white/45 sm:flex-row sm:justify-between sm:py-5 sm:text-xs"><p>© 2026 {settings.storeName}. Mọi quyền được bảo lưu.</p><p className="break-all">Hỗ trợ: {settings.supportEmail}</p></div></div></footer>;
}
