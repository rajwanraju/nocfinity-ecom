import { createCancelOrderHandler } from "@/lib/orders/handlers";

export async function POST(
  request: Request,
  context: { params: Promise<{ order: string }> },
): Promise<Response> {
  const { order } = await context.params;

  return createCancelOrderHandler()(request, order);
}
