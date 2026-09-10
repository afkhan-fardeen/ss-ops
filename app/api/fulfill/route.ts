import { createFulfillment } from "@/lib/shopify/fulfill-order";
import { handleFulfillRequest } from "@/lib/fulfillment/handle-fulfill-request";

/**
 * POST /api/fulfill
 * Pushes a Shopify fulfillment with the provided tracking details.
 */
export async function POST(req: Request) {
  return handleFulfillRequest(req, createFulfillment);
}
