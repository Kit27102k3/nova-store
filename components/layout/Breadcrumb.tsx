import Link from "next/link";

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-2 py-3 text-xs text-muted sm:py-4"><Link href="/" className="hover:text-navy">Trang chủ</Link>{items.map((item, index) => <span key={`${item.label}-${index}`} className="flex items-center gap-2"><span>/</span>{item.href ? <Link href={item.href} className="hover:text-navy">{item.label}</Link> : <span className="text-navy">{item.label}</span>}</span>)}</nav>;
}
