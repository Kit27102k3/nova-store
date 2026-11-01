"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { categories, products } from "@/data/products";
import { ProductCard } from "@/components/products/ProductCard";
import { useStore } from "@/components/store-context";
import { Icon } from "@/components/ui/Icon";

export function ProductCatalog() {
  const params = useSearchParams();
  const router = useRouter();
  const { favorites } = useStore();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [category, setCategory] = useState(params.get("category") ?? "Tất cả");
  const [price, setPrice] = useState(params.get("price") ?? "all");
  const [sort, setSort] = useState(params.get("sort") ?? "newest");
  const [onlyFavorites, setOnlyFavorites] = useState(params.get("favorites") === "1");
  const [visible, setVisible] = useState(8);
  const isFavoritesPage = params.get("favorites") === "1";

  const filtered = useMemo(() => {
    const list = products.filter((product) => {
      const matchesQuery = product.name.toLowerCase().includes(query.trim().toLowerCase()) || product.category.toLowerCase().includes(query.trim().toLowerCase());
      const matchesCategory = category === "Tất cả" || product.category === category;
      const matchesPrice = price === "under-1m" ? product.price < 1000000 : price === "1m-2m" ? product.price >= 1000000 && product.price <= 2000000 : price === "over-2m" ? product.price > 2000000 : true;
      const matchesFavorite = !onlyFavorites || favorites.includes(product.id);
      return matchesQuery && matchesCategory && matchesPrice && matchesFavorite;
    });
    return [...list].sort((a, b) => sort === "price-asc" ? a.price - b.price : sort === "price-desc" ? b.price - a.price : Number(b.isNew) - Number(a.isNew));
  }, [category, favorites, onlyFavorites, price, query, sort]);

  const updateUrl = (next: string) => {
    const url = new URLSearchParams(params.toString());
    url.set("sort", next);
    router.replace(`/products?${url.toString()}`, { scroll: false });
  };
  return <>
    <header className={`relative mt-6 overflow-hidden rounded-[32px] px-7 py-9 sm:px-12 sm:py-12 ${isFavoritesPage ? "bg-gradient-to-br from-[#fff0ec] via-[#fff8f1] to-[#f0efff]" : "bg-gradient-to-br from-[#eef0ff] via-[#f5f4ff] to-[#effaf5]"}`}>
      <div className="pointer-events-none absolute -right-10 -top-20 size-64 rounded-full border-[34px] border-white/50" />
      <div className={`pointer-events-none absolute -bottom-24 right-1/4 size-48 rounded-full blur-3xl ${isFavoritesPage ? "bg-coral/25" : "bg-electric/20"}`} />
      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <p className="section-kicker">{isFavoritesPage ? "Bộ sưu tập của bạn" : "Nova collection"}</p>
          <h1 className="font-display text-4xl leading-tight text-navy sm:text-5xl">{isFavoritesPage ? "Sản phẩm yêu thích" : "Tất cả sản phẩm"}</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-muted sm:text-base">{isFavoritesPage ? "Những món đồ bạn đã lưu, sẵn sàng để quay lại bất cứ lúc nào." : "Khám phá những lựa chọn tối giản, chất lượng và bền bỉ cho mỗi ngày."}</p>
        </div>
        <span className="relative inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/75 px-4 py-2 text-xs font-bold text-navy">
          <Icon name={isFavoritesPage ? "heart" : "bag"} className={`size-4 ${isFavoritesPage ? "text-coral" : "text-cobalt"}`} />
          {isFavoritesPage ? `${favorites.length} sản phẩm đã lưu` : `${products.length} lựa chọn`}
        </span>
      </div>
      <div className="relative mt-7 flex flex-wrap gap-2">
        {categories.map((item, index) => <span key={item.name} className="rounded-full border border-white/80 bg-white/70 px-4 py-2 text-xs font-bold text-navy"><span className={index % 2 ? "text-coral" : "text-cobalt"}>0{index + 1}</span> &nbsp;{item.name}</span>)}
      </div>
    </header>
    <section className="mt-8 rounded-[28px] border border-line bg-gradient-to-br from-white via-white to-mist/80 p-5 shadow-soft sm:p-7" aria-label="Bộ lọc sản phẩm">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
        <label className="flex h-12 items-center gap-3 rounded-xl border border-line bg-white px-4"><span className="sr-only">Tìm kiếm</span><Icon name="search" className="size-5 text-cobalt"/><input value={query} onChange={(event) => { setQuery(event.target.value); setVisible(8); }} placeholder="Tìm tên hoặc danh mục" className="min-w-0 flex-1 outline-none" /></label>
        <select aria-label="Sắp xếp" value={sort} onChange={(event) => { setSort(event.target.value); updateUrl(event.target.value); }} className="h-12 rounded-xl border border-line bg-white px-4 outline-none"><option value="newest">Mới nhất</option><option value="price-asc">Giá tăng dần</option><option value="price-desc">Giá giảm dần</option></select>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <fieldset><legend className="mb-2 text-xs font-bold uppercase tracking-wider text-cobalt">Danh mục</legend><select value={category} onChange={(event) => { setCategory(event.target.value); setVisible(8); }} className="h-11 w-full rounded-xl border border-line bg-white px-3 outline-none"><option>Tất cả</option>{categories.map((item) => <option key={item.name}>{item.name}</option>)}</select></fieldset>
        <fieldset><legend className="mb-2 text-xs font-bold uppercase tracking-wider text-electric">Khoảng giá</legend><select value={price} onChange={(event) => { setPrice(event.target.value); setVisible(8); }} className="h-11 w-full rounded-xl border border-line bg-white px-3 outline-none"><option value="all">Tất cả mức giá</option><option value="under-1m">Dưới 1 triệu</option><option value="1m-2m">Từ 1–2 triệu</option><option value="over-2m">Trên 2 triệu</option></select></fieldset>
        <div><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-coral">Yêu thích</span><button type="button" aria-pressed={onlyFavorites} onClick={() => setOnlyFavorites(!onlyFavorites)} className={`h-11 w-full rounded-xl border px-3 text-sm font-semibold transition ${onlyFavorites ? "border-navy bg-navy text-white" : "border-line bg-white text-navy"}`}><Icon name="heart" className={`mr-2 inline size-4 ${onlyFavorites ? "fill-current" : ""}`} />Chỉ sản phẩm đã lưu</button></div>
      </div>
    </section>
    <p className="mt-8 inline-flex rounded-full bg-mist px-4 py-2 text-sm text-muted">Hiển thị <strong className="mx-1 text-navy">{Math.min(filtered.length, visible)}</strong> trong {filtered.length} sản phẩm</p>
    {filtered.length ? <><div className="product-grid mt-5 grid grid-cols-2 gap-x-3 gap-y-10 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-5">{filtered.slice(0, visible).map((product) => <ProductCard key={product.id} product={product} />)}</div>{visible < filtered.length && <button type="button" onClick={() => setVisible((value) => value + 8)} className="mx-auto mt-12 flex h-11 items-center rounded-full border border-navy px-7 text-sm font-bold text-navy hover:bg-navy hover:text-white">Tải thêm</button>}</> : <div className="relative mt-8 overflow-hidden rounded-[30px] border border-line bg-gradient-to-br from-[#f0efff] via-white to-[#fff0ec] px-6 py-16 text-center">
      <div className="pointer-events-none absolute -left-10 -top-12 size-40 rounded-full bg-electric/10 blur-3xl" />
      <div className="relative mx-auto grid size-16 place-items-center rounded-[22px] bg-white text-coral shadow-soft"><Icon name="heart" className="size-7" /></div>
      <h2 className="relative mt-5 font-display text-3xl text-navy">{isFavoritesPage ? "Chưa có sản phẩm yêu thích" : "Không tìm thấy sản phẩm"}</h2>
      <p className="relative mt-2 text-sm leading-6 text-muted">{isFavoritesPage ? "Chạm vào biểu tượng trái tim trên sản phẩm để lưu những món bạn thích ở đây." : "Thử thay đổi từ khóa hoặc bộ lọc của bạn."}</p>
      {isFavoritesPage ? <Link href="/products" className="relative mt-6 inline-flex h-11 items-center rounded-full bg-navy px-6 text-sm font-bold text-white transition hover:bg-cobalt">Khám phá sản phẩm</Link> : <button type="button" onClick={() => { setQuery(""); setCategory("Tất cả"); setPrice("all"); setOnlyFavorites(false); }} className="relative mt-6 h-11 rounded-full bg-navy px-6 text-sm font-bold text-white">Xóa bộ lọc</button>}
    </div>}
  </>;
}
