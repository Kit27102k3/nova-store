import type { Metadata } from "next";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Liên hệ" };

const contactDetails = [
  { title: "Email", value: "hello@novastore.example", icon: "support" as const, color: "bg-electric/10 text-electric" },
  { title: "Giờ hỗ trợ", value: "Thứ Hai–Thứ Sáu, 9:00–18:00", icon: "star" as const, color: "bg-lime text-navy" },
  { title: "Thời gian phản hồi", value: "Trong vòng 1–2 ngày làm việc", icon: "return" as const, color: "bg-coral/10 text-coral" },
];

export default function ContactPage() {
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
            <div><dt className="text-xs font-bold uppercase tracking-wider text-white/60">{title}</dt><dd className="mt-1 text-sm font-semibold text-white">{value}</dd></div>
          </div>)}
        </dl>
        <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-white/65"><span className="size-2 rounded-full bg-lime"/> Thông tin liên hệ ở trạng thái demo</div>
      </section>

      <form className="rounded-[28px] border border-line bg-gradient-to-br from-white via-white to-mist/80 p-6 shadow-soft sm:p-8" action="#">
        <div className="mb-7">
          <p className="section-kicker">Gửi lời nhắn</p>
          <h2 className="font-display text-3xl text-navy">Bạn cần chúng tôi giúp gì?</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Điền thông tin bên dưới, Nova sẽ sớm phản hồi.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-semibold text-navy">Họ và tên<input required className="mt-2 h-12 w-full rounded-xl border border-line bg-white px-4 outline-none transition focus:border-cobalt" /></label>
          <label className="text-sm font-semibold text-navy">Email<input required type="email" className="mt-2 h-12 w-full rounded-xl border border-line bg-white px-4 outline-none transition focus:border-cobalt" /></label>
          <label className="text-sm font-semibold text-navy sm:col-span-2">Chủ đề<select className="mt-2 h-12 w-full rounded-xl border border-line bg-white px-4 outline-none transition focus:border-cobalt"><option>Sản phẩm</option><option>Đơn hàng</option><option>Giao hàng & đổi trả</option><option>Khác</option></select></label>
          <label className="text-sm font-semibold text-navy sm:col-span-2">Nội dung<textarea required rows={6} className="mt-2 w-full resize-y rounded-xl border border-line bg-white px-4 py-3 outline-none transition focus:border-cobalt" /></label>
        </div>
        <button className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-navy text-sm font-bold text-white transition hover:bg-cobalt sm:w-auto sm:px-8">Gửi tin nhắn <Icon name="arrow" className="size-4"/></button>
      </form>
    </div>
  </div>;
}
