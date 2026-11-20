export type Pagination = {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
};

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export type Category = {
  id: number;
  parent_id: number | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  children: Category[];
};

export type ProductImage = {
  id: number;
  path: string;
  url: string;
  alt: string | null;
  is_primary: boolean;
  sort_order: number;
};

export type ProductSummary = {
  id: number;
  name: string;
  slug: string;
  sku: string;
  price: number;
  discount_price: number | null;
  current_price: number;
  has_discount: boolean;
  stock: number;
  stock_status: StockStatus;
  is_active: boolean;
  category: Category | null;
  primary_image: ProductImage | null;
};

export type Product = ProductSummary & {
  description: string | null;
  images: ProductImage[];
  related: ProductSummary[];
  created_at: string | null;
  updated_at: string | null;
};

export type CartLine = {
  id: number;
  product_id: number;
  name: string | null;
  slug: string | null;
  sku: string | null;
  image_url: string | null;
  quantity: number;
  unit_price: number;
  current_unit_price: number;
  line_total: number;
  available_quantity: number;
  is_available: boolean;
  warnings: string[];
};

export type CartCoupon = {
  code: string;
  type: "percentage" | "fixed";
  value: number;
  discount: number;
};

export type CartTotals = {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
};

export type Cart = {
  id: number;
  is_guest: boolean;
  items: CartLine[];
  item_count: number;
  coupon: CartCoupon | null;
  totals: CartTotals;
};
