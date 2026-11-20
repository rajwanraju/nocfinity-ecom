import { handleCartRequest } from "@/lib/cart/handlers";

export function POST(request: Request) {
  return handleCartRequest(request, { type: "add" });
}
