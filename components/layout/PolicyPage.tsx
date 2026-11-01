import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/layout/Breadcrumb";

export type PolicySection = { title: string; body: string[] };

export function policyMetadata(title: string): Metadata { return { title }; }

export function PolicyPage({ title, kicker, intro, sections }: { title: string; kicker: string; intro: string; sections: PolicySection[] }) {
  return <div className="container-shell pb-20"><Breadcrumb items={[{ label: title }]} /><header className="mt-8 max-w-3xl"><p className="section-kicker">{kicker}</p><h1 className="font-display text-5xl leading-tight text-navy">{title}</h1><p className="mt-5 text-base leading-8 text-muted">{intro}</p></header><div className="mt-12 grid gap-10 lg:grid-cols-[.7fr_1.3fr]"><aside className="h-fit rounded-2xl bg-mist p-6"><h2 className="font-bold text-navy">Cần hỗ trợ thêm?</h2><p className="mt-2 text-sm leading-6 text-muted">Đội Nova luôn sẵn sàng giải đáp thắc mắc.</p><Link href="/contact" className="mt-5 inline-flex h-11 items-center rounded-full bg-navy px-5 text-sm font-bold text-white">Liên hệ Nova</Link></aside><div className="divide-y divide-line border-y border-line">{sections.map((section) => <section key={section.title} className="py-8"><h2 className="font-display text-2xl text-navy">{section.title}</h2>{section.body.map((paragraph) => <p key={paragraph} className="mt-3 text-sm leading-7 text-muted">{paragraph}</p>)}</section>)}</div></div></div>;
}
