import "server-only";

import { cookies } from "next/headers";
import { apiFetch } from "@/lib/api/server";
import type { Cart } from "@/lib/api/types";
import { sessionCookieName } from "@/lib/auth/cookies";
import { cartCookieName } from "./cookies";

/**
 * Reads the cart for the current visitor. A visitor with neither a customer
 * token nor a guest cart cookie has no cart yet, so we avoid creating an
 * orphan guest cart just to render the page.
 */
export async function getCurrentCart(): Promise<Cart | null> {
  const store = await cookies();
  const token = store.get(sessionCookieName("customer"))?.value ?? null;
  const cartToken = store.get(cartCookieName())?.value ?? null;

  if (!token && !cartToken) {
    return null;
  }

  try {
    const result = await apiFetch<Cart>("/cart", { token, cartToken });

    return result.data;
  } catch {
    return null;
  }
}
