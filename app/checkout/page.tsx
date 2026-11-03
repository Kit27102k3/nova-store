import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { CheckoutView } from "@/components/cart/CheckoutView";
import { getCheckoutCustomerDetails } from "@/lib/supabase/customer";

export const metadata: Metadata = { title: "Thanh toán" };
export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="container-shell pb-20">
          <div
            aria-label="Đang tải thanh toán"
            className="mt-10 h-[520px] animate-pulse rounded-[28px] bg-mist"
          />
        </div>
      }
    >
      <CheckoutSession />
    </Suspense>
  );
}

async function CheckoutSession() {
  await connection();
  const customer = await getCheckoutCustomerDetails();
  return <CheckoutView customer={customer} />;
}
