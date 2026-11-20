import { handleCartRequest } from "@/lib/cart/handlers";

type RouteContext = { params: Promise<{ item: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const { item } = await params;

  return handleCartRequest(request, { type: "update", itemId: item });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const { item } = await params;

  return handleCartRequest(request, { type: "remove", itemId: item });
}
