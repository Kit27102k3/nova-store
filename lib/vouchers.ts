export type VoucherQuote = {
  code: string;
  discount: number;
  subtotal: number;
};

export type AvailableVoucher = {
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_subtotal: number;
  max_discount: number | null;
  expires_at: string | null;
};

export type AdminVoucher = AvailableVoucher & {
  id: string;
  starts_at: string | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
};
