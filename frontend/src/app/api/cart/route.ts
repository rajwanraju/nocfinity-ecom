import { handleCartRequest } from "@/lib/cart/handlers";

export function GET(request: Request) {
  return handleCartRequest(request, { type: "show" });
}

export function DELETE(request: Request) {
  return handleCartRequest(request, { type: "clear" });
}
