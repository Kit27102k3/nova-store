import { BenefitsSection, CategorySection, FeaturedProducts, HeroSection, NewProducts, PromoBanner } from "@/components/home/HomeSections";
import { Newsletter } from "@/components/home/Newsletter";

export default function Home() {
  return <><HeroSection /><CategorySection /><FeaturedProducts /><PromoBanner /><NewProducts /><BenefitsSection /><Newsletter /></>;
}
