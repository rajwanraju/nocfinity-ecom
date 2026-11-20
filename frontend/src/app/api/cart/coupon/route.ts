import { handleCartRequest } from "@/lib/cart/handlers";

export function POST(request: Request) {
  return handleCartRequest(request, { type: "apply-coupon" });
}

export function DELETE(request: Request) {
  return handleCartRequest(request, { type: "remove-coupon" });
}
