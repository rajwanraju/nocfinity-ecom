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

export type OrderStatus = "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled";

export type OrderItem = {
  id: number;
  product_id: number | null;
  product_name: string;
  product_sku: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  image_url: string | null;
};

export type OrderShipping = {
  name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

export type Order = {
  id: number;
  order_number: string;
  status: OrderStatus;
  subtotal: number;
  discount_total: number;
  shipping_total: number;
  tax_total: number;
  grand_total: number;
  coupon_code: string | null;
  customer_name: string;
  customer_email: string;
  shipping: OrderShipping;
  notes: string | null;
  placed_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  items?: OrderItem[];
  payment_status?: string | null;
  created_at: string | null;
};

export type OrderCheckoutPayload = {
  order: Order;
  payment: { client_secret: string | null };
};
