"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, type FormEvent } from "react";
import { useStore } from "@/components/store-context";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { Icon } from "@/components/ui/Icon";

const links = [
  ["Trang chủ", "/"],
  ["Sản phẩm", "/products"],
  ["Danh mục", "/categories"],
  ["Liên hệ", "/contact"],
] as const;

type AccountUser = {
  email: string;
  name?: string;
};

export function Header() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [accountUser, setAccountUser] = useState<AccountUser | null>(null);
  const [authChecked, setAuthChecked] = useState(
    () => !getSupabaseConfig(),
  );
  const router = useRouter();
  const { cart, favorites, settings } = useStore();
  const quantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const shippingThreshold = new Intl.NumberFormat("vi-VN").format(
    settings.shippingThreshold,
  );

  const refreshAccountUser = useCallback(async () => {
    if (!getSupabaseConfig()) {
      setAccountUser(null);
      setAuthChecked(true);
      return;
    }

    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Tải trạng thái tài khoản thất bại (${response.status}).`);
      }

      const result: { user: AccountUser | null } = await response.json();
      setAccountUser(result.user);
    } catch (error) {
      console.error("Không thể tải trạng thái tài khoản.", error);
    } finally {
      setAuthChecked(true);
    }
  }, []);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = search.trim();
    router.push(query ? `/products?q=${encodeURIComponent(query)}` : "/products");
    setOpen(false);
  };

  return (
    <>
      <div className="bg-navy px-3 py-1.5 text-center text-[9px] font-bold tracking-wide text-white sm:py-2 sm:text-[11px] sm:font-medium">
        {settings.shippingThreshold === 0
          ? "MIỄN PHÍ VẬN CHUYỂN CHO MỌI ĐƠN HÀNG"
          : `MIỄN PHÍ VẬN CHUYỂN CHO ĐƠN HÀNG TỪ ${shippingThreshold}đ`}
      </div>
      <header className="sticky top-0 z-50 border-b border-line/70 bg-white/95 backdrop-blur">
        <div className="container-shell flex h-16 items-center gap-2 sm:h-[74px] sm:gap-5">
          <button
            type="button"
            className="icon-button size-10 shrink-0 lg:hidden sm:size-11"
            aria-label={open ? "Đóng menu" : "Mở menu"}
            aria-expanded={open}
            onClick={() => {
              setOpen(!open);
              void refreshAccountUser();
            }}
          >
            <Icon name={open ? "close" : "menu"} className="size-5" />
          </button>
          <Link
            href="/"
            className="shrink-0 font-display text-xl font-bold tracking-[0.16em] text-navy sm:text-2xl sm:tracking-[0.18em]"
            aria-label="Nova Store trang chủ"
          >
            NOVA
          </Link>
          <nav
            className="hidden items-center gap-7 lg:flex"
            aria-label="Điều hướng chính"
          >
            {links.map(([label, href]) => (
              <Link key={href} href={href} className="nav-link">
                {label}
              </Link>
            ))}
          </nav>
          <form
            onSubmit={submit}
            role="search"
            className="ml-auto hidden h-10 max-w-64 flex-1 items-center rounded-full bg-mist px-4 md:flex"
          >
            <label htmlFor="header-search" className="sr-only">
              Tìm kiếm sản phẩm
            </label>
            <input
              id="header-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm sản phẩm"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
            <button className="text-muted" aria-label="Tìm kiếm">
              <Icon name="search" className="size-4" />
            </button>
          </form>
          <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:ml-0 sm:gap-1">
            <div
              className="group relative hidden sm:block"
              onMouseEnter={() => void refreshAccountUser()}
              onFocus={() => void refreshAccountUser()}
            >
              <Link
                href="/account"
                className="icon-button"
                aria-label="Tài khoản và đơn hàng"
              >
                <Icon name="user" className="size-5" />
              </Link>
              <nav
                aria-label="Menu tài khoản"
                className="invisible absolute right-0 top-full z-50 w-64 translate-y-2 rounded-2xl border border-line bg-white p-2 opacity-0 shadow-soft transition duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100"
              >
                {!authChecked ? (
                  <span className="block rounded-xl px-4 py-3 text-sm text-muted">
                    Đang kiểm tra tài khoản...
                  </span>
                ) : accountUser ? (
                  <>
                    <Link
                      href="/account"
                      className="block rounded-xl px-4 py-3 transition hover:bg-mist"
                    >
                      <span className="block truncate text-sm font-bold text-navy">
                        {accountUser.name || "Tài khoản của tôi"}
                      </span>
                      <span className="mt-1 block truncate text-xs text-muted">
                        {accountUser.email}
                      </span>
                    </Link>
                    <div className="my-1 border-t border-line" />
                    <Link
                      href="/account/orders"
                      className="block rounded-xl px-4 py-3 text-sm text-ink transition hover:bg-mist"
                    >
                      Đơn hàng của tôi
                    </Link>
                    <Link
                      href="/account/addresses"
                      className="block rounded-xl px-4 py-3 text-sm text-ink transition hover:bg-mist"
                    >
                      Địa chỉ giao hàng
                    </Link>
                    <Link
                      href="/products?favorites=1"
                      className="block rounded-xl px-4 py-3 text-sm text-ink transition hover:bg-mist"
                    >
                      Sản phẩm yêu thích
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/account"
                      className="block rounded-xl px-4 py-3 text-sm font-bold text-navy transition hover:bg-mist"
                    >
                      Đăng nhập / Đăng ký
                    </Link>
                    <div className="my-1 border-t border-line" />
                    <Link
                      href="/account/orders"
                      className="block rounded-xl px-4 py-3 text-sm text-ink transition hover:bg-mist"
                    >
                      Đơn hàng của tôi
                    </Link>
                    <Link
                      href="/account/addresses"
                      className="block rounded-xl px-4 py-3 text-sm text-ink transition hover:bg-mist"
                    >
                      Địa chỉ giao hàng
                    </Link>
                    <Link
                      href="/products?favorites=1"
                      className="block rounded-xl px-4 py-3 text-sm text-ink transition hover:bg-mist"
                    >
                      Sản phẩm yêu thích
                    </Link>
                  </>
                )}
              </nav>
            </div>
            <Link
              href="/products?favorites=1"
              className="icon-button relative size-10 sm:size-11"
              aria-label={`Yêu thích, ${favorites.length} sản phẩm`}
            >
              <Icon name="heart" className="size-5" />
              {favorites.length > 0 && (
                <span className="count-badge">{favorites.length}</span>
              )}
            </Link>
            <Link
              href="/cart"
              className="icon-button relative size-10 sm:size-11"
              aria-label={`Giỏ hàng, ${quantity} sản phẩm`}
            >
              <Icon name="bag" className="size-5" />
              {quantity > 0 && <span className="count-badge">{quantity}</span>}
            </Link>
          </div>
        </div>
        <form
          onSubmit={submit}
          role="search"
          className="container-shell flex h-11 items-center gap-3 rounded-xl border border-line bg-mist/80 px-3 md:hidden"
        >
          <label htmlFor="mobile-search" className="sr-only">
            Tìm kiếm sản phẩm
          </label>
          <Icon name="search" className="size-4 shrink-0 text-cobalt" />
          <input
            id="mobile-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm sản phẩm"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          <button
            type="submit"
            aria-label="Tìm kiếm"
            className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-navy shadow-sm"
          >
            <Icon name="arrow" className="size-4" />
          </button>
        </form>
        {open && (
          <div className="border-t border-line bg-white px-4 pb-5 pt-3 lg:hidden">
            <nav
              className="grid grid-cols-2 gap-2"
              aria-label="Điều hướng di động"
            >
              {links.map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center rounded-xl bg-mist px-3 text-sm font-bold text-navy transition active:bg-[#e9edff]"
                >
                  {label}
                </Link>
              ))}
              <Link
                href="/account"
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center rounded-xl bg-mist px-3 text-sm font-bold text-navy transition active:bg-[#e9edff]"
              >
                {accountUser ? "Tài khoản của tôi" : "Đăng nhập / Đăng ký"}
              </Link>
              <Link
                href="/account/orders"
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center rounded-xl bg-mist px-3 text-sm font-bold text-navy transition active:bg-[#e9edff]"
              >
                Đơn hàng của tôi
              </Link>
              <Link
                href="/account/addresses"
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center rounded-xl bg-mist px-3 text-sm font-bold text-navy transition active:bg-[#e9edff]"
              >
                Địa chỉ giao hàng
              </Link>
              <Link
                href="/products?favorites=1"
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center rounded-xl bg-mist px-3 text-sm font-bold text-navy transition active:bg-[#e9edff]"
              >
                Sản phẩm yêu thích
              </Link>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
