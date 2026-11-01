export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function categoryHref(category: string) {
  return `/products?category=${encodeURIComponent(category)}`;
}
