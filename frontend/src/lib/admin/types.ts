import type { Order, OrderItem, OrderShipping, OrderStatus } from "@/lib/api/types";

export type DashboardOrder = {
  id: number;
  order_number: string;
  status: OrderStatus;
  customer_name: string;
  customer_email: string;
  grand_total: number;
  placed_at: string | null;
  items_count: number;
};

export type SalesPoint = {
  date: string;
  orders: number;
  revenue: number;
};

export type DashboardSummary = {
  today_orders: number;
  today_revenue: number;
  total_customers: number;
  low_stock_count: number;
  sales_series: SalesPoint[];
  recent_orders: DashboardOrder[];
};

export type OrderStatusHistory = {
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  note: string | null;
  changed_by: number | null;
  created_at: string | null;
};

export type AdminOrder = Order & {
  customer: { id: number; name: string; email: string } | null;
  items: OrderItem[];
  shipping: OrderShipping;
  status_history: OrderStatusHistory[];
  valid_transitions: OrderStatus[];
};

export type Coupon = {
  id: number;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  usage_limit: number | null;
  per_user_limit: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export type CustomerOrderSummary = {
  id: number;
  order_number: string;
  status: OrderStatus;
  grand_total: number;
  items_count: number;
  placed_at: string | null;
};

export type CustomerSummary = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  orders_count: number;
  total_spent: number;
  last_order_at: string | null;
  created_at: string | null;
};

export type Customer = CustomerSummary & {
  orders?: CustomerOrderSummary[];
};

export type Role = {
  id: number;
  name: string;
  is_system: boolean;
  permissions: string[];
  staff_count: number;
};

export type PermissionItem = {
  name: string;
  label: string;
};

export type PermissionGroup = {
  key: string;
  label: string;
  permissions: PermissionItem[];
};

export type PermissionMatrix = {
  groups: PermissionGroup[];
  roles: Role[];
};

export type Staff = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  type: "staff";
  is_active: boolean;
  email_verified_at: string | null;
  created_at: string;
  roles: string[];
  permissions: string[];
};

export type ActivityEntry = {
  id: number;
  action: string;
  description: string;
  subject_type: string | null;
  subject_id: number | null;
  properties: Record<string, unknown> | null;
  user: { id: number; name: string } | null;
  ip_address: string | null;
  created_at: string | null;
};
