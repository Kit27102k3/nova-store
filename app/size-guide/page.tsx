import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
export const metadata: Metadata = { title: "Bảng size" };
export default function SizeGuidePage() {
  const sizes = [
    ["S", "42", "84–88", "66–70", "88–92"],
    ["M", "44", "89–93", "71–75", "93–97"],
    ["L", "46", "94–98", "76–80", "98–102"],
    ["XL", "48", "99–104", "81–86", "103–108"],
  ];
  const measurements = [
    ["Vòng ngực", "Đo quanh phần đầy nhất, giữ thước song song sàn."],
    ["Vòng eo", "Đo quanh phần eo nhỏ nhất, không siết thước."],
    ["Vòng mông", "Đo quanh phần đầy nhất khi hai chân khép gần."],
  ];
  return <div className="container-shell pb-20"><Breadcrumb items={[{ label: "Bảng size" }]} /><p className="section-kicker mt-8">Nova fit guide</p><h1 className="font-display text-5xl leading-tight text-navy">Tìm size phù hợp</h1><p className="mt-5 max-w-2xl text-sm leading-7 text-muted">Đo cơ thể khi đứng thẳng và mặc trang phục nhẹ. Các số liệu dưới đây là hướng dẫn chung cho sản phẩm quần áo Nova.</p><div className="mt-10 overflow-x-auto rounded-[24px] border border-line"><table className="w-full min-w-[650px] border-collapse text-left"><thead className="bg-mist text-xs uppercase tracking-wider text-muted"><tr><th className="p-4">Size</th><th className="p-4">Vai (cm)</th><th className="p-4">Ngực (cm)</th><th className="p-4">Eo (cm)</th><th className="p-4">Mông (cm)</th></tr></thead><tbody>{sizes.map((row) => <tr key={row[0]} className="border-t border-line text-sm">{row.map((cell) => <td key={cell} className="p-4">{cell}</td>)}</tr>)}</tbody></table></div><div className="mt-10 grid gap-5 md:grid-cols-3">{measurements.map(([title, body]) => <div key={title} className="rounded-2xl bg-mist p-6"><h2 className="font-bold text-navy">{title}</h2><p className="mt-2 text-sm leading-6 text-muted">{body}</p></div>)}</div><Link href="/contact" className="mt-8 inline-flex h-11 items-center rounded-full border border-navy px-6 text-sm font-bold text-navy">Cần tư vấn thêm</Link></div>;
  }
