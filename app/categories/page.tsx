import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { categories } from "@/data/products";
import { categoryHref } from "@/lib/utils";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Danh mục" };

export default function CategoriesPage() {
  return <div className="container-shell pb-20">
    <Breadcrumb items={[{ label: "Danh mục" }]} />
    <header className="relative mt-6 overflow-hidden rounded-[32px] bg-gradient-to-br from-[#eef0ff] via-[#f8f6ff] to-[#fff0ec] px-7 py-9 sm:px-12 sm:py-12">
      <div className="pointer-events-none absolute -right-10 -top-20 size-64 rounded-full border-[34px] border-white/50" />
      <div className="pointer-events-none absolute -bottom-20 left-1/3 size-48 rounded-full bg-lime/50 blur-3xl" />
      <div className="relative max-w-2xl">
        <p className="section-kicker">Nova collection</p>
        <h1 className="font-display text-4xl leading-tight text-navy sm:text-5xl">Khám phá theo danh mục</h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-muted sm:text-base">Từ tủ đồ hằng ngày đến không gian và công nghệ, tìm thứ phù hợp với nhịp sống của bạn.</p>
        <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/75 px-4 py-2 text-xs font-bold text-navy"><Icon name="star" className="size-4 fill-amber-400 text-amber-400" />Bốn bộ sưu tập, vô vàn cách phối</div>
      </div>
    </header>

    <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {categories.map((category, index) => {
        const accents = ["border-coral", "border-electric", "border-cobalt", "border-lime"];
        return <Link key={category.name} href={categoryHref(category.name)} className={`group overflow-hidden rounded-[28px] border-b-4 bg-white shadow-soft transition duration-300 hover:-translate-y-2 hover:shadow-lg ${accents[index]}`}>
          <div className="relative aspect-[.82] overflow-hidden">
            <Image src={category.image} alt={category.name} fill sizes="(max-width:640px) 50vw,25vw" className="object-cover transition duration-700 group-hover:scale-105"/>
            <div className="absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/5 to-transparent"/>
            <p className="absolute left-5 top-5 grid size-11 place-items-center rounded-full border border-white/70 bg-white/85 text-xs font-extrabold text-navy shadow-soft">0{index + 1}</p>
            <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
              <span className="text-[10px] font-bold uppercase tracking-[.2em] text-lime">Bộ sưu tập Nova</span>
              <h2 className="mt-2 font-display text-3xl">{category.name}</h2>
              <p className="mt-2 text-sm leading-5 text-white/90">{category.description}</p><span className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider">Khám phá <span aria-hidden="true">→</span></span>
              <span className="mt-5 inline-flex size-10 items-center justify-center rounded-full bg-white text-navy transition group-hover:bg-lime"><Icon name="arrow" className="size-4"/></span>
            </div>
          </div>
        </Link>;
      })}
    </div>
  </div>;
}
