import type { Metadata } from "next";
import { Suspense } from "react";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { ProductCatalog } from "@/components/products/ProductCatalog";

export const metadata: Metadata = { title: "Sản phẩm" };

export default function ProductsPage() {
  return <div className="pb-20 pt-8"><div className="container-shell"><Breadcrumb items={[{ label: "Sản phẩm" }]} /><Suspense fallback={<div className="mt-8 h-[480px] animate-pulse rounded-[32px] bg-mist" />}><ProductCatalog /></Suspense></div></div>;
}
