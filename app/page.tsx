import { BenefitsSection, CategorySection, FeaturedProducts, HeroSection, NewProducts, PromoBanner } from "@/components/home/HomeSections";
import { Newsletter } from "@/components/home/Newsletter";
import { getStoreCatalog } from "@/lib/supabase/catalog";

export default async function Home() {
  const { categories, products } = await getStoreCatalog();
  return <><HeroSection /><CategorySection categories={categories} /><FeaturedProducts products={products} /><PromoBanner /><NewProducts products={products} /><BenefitsSection /><Newsletter /></>;
}
