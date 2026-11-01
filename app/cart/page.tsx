import type { Metadata } from "next";
import { CartView } from "@/components/cart/CartView";

export const metadata: Metadata = { title: "Giỏ hàng" };
export default function CartPage() { return <div className="pb-20 pt-8"><div className="container-shell"><CartView /></div></div>; }
