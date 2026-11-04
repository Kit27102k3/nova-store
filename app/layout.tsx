import type { Metadata } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import { Suspense, type ReactNode } from "react";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { RouteTransition } from "@/components/layout/RouteTransition";
import { StoreChatbot } from "@/components/chat/StoreChatbot";
import { StoreProvider } from "@/components/store-context";
import { getStoreCatalog } from "@/lib/supabase/catalog";
import { products } from "@/data/products";
import type { StoreSettings } from "@/lib/supabase/catalog";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Nova Store", template: "%s | Nova Store" },
  description: "Thời trang, phụ kiện và đồ sống tối giản cho cuộc sống hiện đại.",
};

const fallbackSettings: StoreSettings = {
  storeName: "Nova Store",
  supportEmail: "hello@novastore.example",
  shippingThreshold: 499000,
  shippingFee: 30000,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      data-scroll-behavior="smooth"
      className={`${manrope.variable} ${playfair.variable}`}
    >
      <body>
        <Suspense fallback={<StoreFrameFallback />}>
          <StoreFrame>{children}</StoreFrame>
        </Suspense>
      </body>
    </html>
  );
}

async function StoreFrame({ children }: { children: ReactNode }) {
  const { products, settings } = await getStoreCatalog();
  return (
    <StoreProvider products={products} settings={settings}>
      <Header />
      <main className="min-h-[60vh] flex-1">
        <RouteTransition>{children}</RouteTransition>
      </main>
      <Footer settings={settings} />
      <StoreChatbot />
    </StoreProvider>
  );
}

function StoreFrameFallback() {
  return (
    <StoreProvider products={products} settings={fallbackSettings}>
      <Header />
      <main className="min-h-[60vh] flex-1" aria-busy="true">
        <div className="container-shell py-16">
          <div
            aria-label="Đang tải cửa hàng"
            className="h-96 animate-pulse rounded-[32px] bg-mist"
          />
        </div>
      </main>
      <Footer settings={fallbackSettings} />
    </StoreProvider>
  );
}
