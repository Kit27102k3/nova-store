import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { Icon } from "@/components/ui/Icon";
import { AccountAuth } from "@/components/account/AccountAuth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Tài khoản" };

const authNotices: Record<string, string> = {
  "callback-error":
    "Liên kết xác nhận không hợp lệ hoặc đã hết hạn. Hãy thử đăng nhập hoặc yêu cầu gửi lại email.",
  "password-updated": "Mật khẩu của bạn đã được cập nhật.",
};

export default function AccountPage({
  searchParams,
}: PageProps<"/account">) {
  return <div className="container-shell pb-20">
    <Breadcrumb items={[{ label: "Tài khoản" }]} />
    <div className="relative mx-auto grid max-w-6xl gap-10 overflow-hidden rounded-[36px] bg-gradient-to-br from-[#eef0ff] via-white to-[#fff0ec] p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,.78fr)] lg:items-center lg:gap-12 lg:p-12">
      <div className="pointer-events-none absolute -left-20 top-1/4 size-64 rounded-full bg-electric/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 -top-20 size-64 rounded-full border-[34px] border-white/40" />
      <section className="relative max-w-lg">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/75 px-4 py-2 text-[10px] font-extrabold uppercase tracking-[.18em] text-cobalt"><span className="size-2 rounded-full bg-lime"/> Nova member</span>
        <Suspense
          fallback={
            <>
              <h1 className="mt-5 font-display text-4xl leading-tight text-navy sm:text-5xl">Chào mừng đến với Nova</h1>
              <p className="mt-4 max-w-lg text-sm leading-7 text-muted">Đăng nhập hoặc tạo tài khoản để theo dõi đơn hàng, lưu địa chỉ giao hàng và quản lý sản phẩm yêu thích.</p>
              <div
                aria-label="Đang tải tài khoản"
                className="mt-8 h-[360px] animate-pulse rounded-[28px] bg-white/90 shadow-soft"
              />
            </>
          }
        >
          <AccountSession searchParams={searchParams} />
        </Suspense>
      </section>

      <aside className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-electric via-[#525bd7] to-navy p-8 text-white shadow-soft sm:p-10">
        <div className="pointer-events-none absolute -right-8 -top-10 size-40 rounded-full border-[18px] border-white/10" />
        <div className="relative grid size-14 place-items-center rounded-2xl bg-white/15 text-lime"><Icon name="heart" className="size-6" /></div>
        <h2 className="relative mt-6 font-display text-3xl text-white">Mua sắm dễ dàng hơn</h2>
        <ul className="relative mt-6 space-y-5">
          {[["Theo dõi đơn hàng", "Cập nhật trạng thái từ lúc đặt hàng đến khi nhận."], ["Danh sách yêu thích", "Lưu sản phẩm và quay lại mua sắm bất cứ lúc nào."], ["Địa chỉ giao hàng", "Lưu thông tin nhận hàng cho những lần mua tiếp theo."]].map(([title, text]) => <li key={title} className="flex gap-3"><span className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-lime text-navy"><Icon name="check" className="size-3" /></span><div><h3 className="font-bold text-white">{title}</h3><p className="mt-1 text-sm leading-6 text-white/70">{text}</p></div></li>)}
        </ul>
      </aside>
    </div>
  </div>;
}

async function AccountSession({
  searchParams,
}: Pick<PageProps<"/account">, "searchParams">) {
  await connection();
  const params = await searchParams;
  const configured = Boolean(getSupabaseConfig());
  let user = null;

  if (configured) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error && error.name !== "AuthSessionMissingError") {
      console.error("Không thể xác minh phiên tài khoản Supabase.", error);
    }
    user = data.user;
  }

  const name =
    typeof user?.user_metadata.full_name === "string"
      ? user.user_metadata.full_name
      : undefined;
  let phone = "";
  if (user) {
    const supabase = await createSupabaseServerClient();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("phone")
      .eq("id", user.id)
      .maybeSingle();
    if (error) {
      console.error("Không thể tải số điện thoại hồ sơ.", error);
    } else {
      phone = profile?.phone ?? "";
    }
  }

  return (
    <>
      <h1 className="mt-5 font-display text-4xl leading-tight text-navy sm:text-5xl">
        {user ? `Chào mừng trở lại, ${name || "bạn"}` : "Chào mừng đến với Nova"}
      </h1>
      <p className="mt-4 max-w-lg text-sm leading-7 text-muted">
        {user
          ? "Bạn đã đăng nhập thành công. Quản lý tài khoản và tiếp tục hành trình mua sắm tại Nova."
          : "Đăng nhập hoặc tạo tài khoản để theo dõi đơn hàng, lưu địa chỉ giao hàng và quản lý sản phẩm yêu thích."}
      </p>
      <div className="mt-8 rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-soft backdrop-blur sm:p-7">
        <AccountAuth
          configured={configured}
          email={user?.email}
          name={name}
          phone={phone}
          notice={
            typeof params.auth === "string"
              ? authNotices[params.auth]
              : undefined
          }
        />
      </div>
    </>
  );
}
