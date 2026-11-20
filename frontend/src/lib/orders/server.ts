import "server-only";

import type { ApiPagination } from "@/lib/api/server";
import { apiFetch } from "@/lib/api/server";
import type { Order } from "@/lib/api/types";
import { getSessionToken } from "@/lib/auth/server";

/** Customer order reads run server-side so the bearer token never reaches the browser. */
export async function getOrder(orderId: string): Promise<Order | null> {
  if (!/^\d+$/.test(orderId)) {
    return null;
  }

  const token = await getSessionToken("customer");

  if (!token) {
    return null;
  }

  try {
    const result = await apiFetch<Order>(`/orders/${orderId}`, { token });

    return result.data;
  } catch {
    return null;
  }
}

export async function getOrders(
  page: number,
): Promise<{ orders: Order[]; pagination: ApiPagination | null }> {
  const token = await getSessionToken("customer");

  if (!token) {
    return { orders: [], pagination: null };
  }

  try {
    const result = await apiFetch<Order[]>("/orders", { token, query: { page } });

    return { orders: result.data, pagination: result.meta?.pagination ?? null };
  } catch {
    return { orders: [], pagination: null };
  }
}
