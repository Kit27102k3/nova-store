import type { Metadata } from "next";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { Icon } from "@/components/ui/Icon";
import { ContactForm } from "@/components/contact/ContactForm";
import { getStoreCatalog } from "@/lib/supabase/catalog";

export const metadata: Metadata = { title: "Liên hệ" };

export default async function ContactPage() {
  const { settings } = await getStoreCatalog();
  const supportConfigured = !settings.supportEmail.toLowerCase().endsWith(".example");
  const contactDetails = [
    { title: "Email", value: supportConfigured ? settings.supportEmail : "Chưa cấu hình", icon: "support" as const, color: "bg-electric/10 text-electric" },
    { title: "Giờ hỗ trợ", value: "Thứ Hai–Thứ Sáu, 9:00–18:00", icon: "star" as const, color: "bg-lime text-navy" },
    { title: "Thời gian phản hồi", value: "Trong vòng 1–2 ngày làm việc", icon: "return" as const, color: "bg-coral/10 text-coral" },
  ];
  return <div className="container-shell pb-20">
    <Breadcrumb items={[{ label: "Liên hệ" }]} />
    <header className="relative mt-6 overflow-hidden rounded-[32px] bg-gradient-to-br from-[#eef0ff] via-[#f7f5ff] to-[#fff0ec] px-7 py-9 sm:px-12 sm:py-12">
      <div className="pointer-events-none absolute -right-10 -top-20 size-64 rounded-full border-[34px] border-white/50" />
      <div className="pointer-events-none absolute -bottom-24 right-1/4 size-48 rounded-full bg-coral/20 blur-3xl" />
      <div className="relative max-w-3xl">
        <p className="section-kicker">Nova support</p>
        <h1 className="font-display text-4xl leading-tight text-navy sm:text-5xl">Chúng tôi luôn sẵn sàng hỗ trợ</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted sm:text-base">Gửi câu hỏi về sản phẩm, đơn hàng hoặc chính sách mua sắm. Đội ngũ Nova sẽ đồng hành cùng bạn.</p>
      </div>
    </header>

    <div className="mt-8 grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
      <section className="rounded-[28px] bg-gradient-to-br from-navy via-[#202746] to-electric p-6 text-white sm:p-8">
        <div className="grid size-14 place-items-center rounded-2xl bg-white/10 text-lime"><Icon name="support" className="size-7"/></div>
        <h2 className="mt-6 font-display text-3xl">Kết nối với Nova</h2>
        <p className="mt-3 text-sm leading-7 text-white/70">Cần trợ giúp? Chọn cách liên hệ phù hợp, chúng tôi luôn sẵn lòng lắng nghe.</p>
        <dl className="mt-7 space-y-3">
          {contactDetails.map(({ title, value, icon, color }) => <div key={title} className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${color}`}><Icon name={icon} className="size-5"/></span>
            <div><dt className="text-xs font-bold uppercase tracking-wider text-white/60">{title}</dt><dd className="mt-1 text-sm font-semibold text-white">{title === "Email" && supportConfigured ? <a href={`mailto:${encodeURIComponent(settings.supportEmail)}`} className="hover:underline">{value}</a> : value}</dd></div>
          </div>)}
        </dl>
        <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-white/65"><span className={`size-2 rounded-full ${supportConfigured ? "bg-lime" : "bg-coral"}`}/> {supportConfigured ? "Email hỗ trợ được cấu hình bởi cửa hàng" : "Cửa hàng cần cấu hình email hỗ trợ trong trang quản trị"}</div>
      </section>

      {supportConfigured ? (
        <ContactForm supportEmail={settings.supportEmail} />
      ) : (
        <div
          role="status"
          className="grid min-h-64 place-items-center rounded-[28px] border border-line bg-mist p-8 text-center text-sm leading-7 text-muted"
        >
          Biểu mẫu liên hệ sẽ hoạt động sau khi cửa hàng cấu hình email hỗ trợ
          trong trang quản trị.
        </div>
      )}
    </div>
  </div>;
}
