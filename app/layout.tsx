import type { Metadata } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { StoreProvider } from "@/components/store-context";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Nova Store", template: "%s | Nova Store" },
  description: "Thời trang, phụ kiện và đồ sống tối giản cho cuộc sống hiện đại.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${manrope.variable} ${playfair.variable}`}>
      <body>
        <StoreProvider>
          <Header />
          <main className="min-h-[60vh] flex-1">{children}</main>
          <Footer />
        </StoreProvider>
      </body>
    </html>
  );
}
