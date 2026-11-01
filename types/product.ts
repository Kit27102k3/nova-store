export type Category = string;

export type Product = {
  id: number;
  slug: string;
  name: string;
  category: Category;
  price: number;
  originalPrice?: number;
  rating: number;
  reviews: number;
  badge?: "Bán chạy" | "Mới";
  isNew?: boolean;
  images: string[];
  description: string;
  details: string[];
  variants?: {
    label: string;
    options: string[];
  };
};

export type CartItem = {
  productId: number;
  quantity: number;
  variant?: string;
};
