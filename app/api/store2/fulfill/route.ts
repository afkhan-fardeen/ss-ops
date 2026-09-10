import { createStore2Fulfillment } from "@/lib/store2/fulfill-order";
import { handleFulfillRequest } from "@/lib/fulfillment/handle-fulfill-request";

/**
 * POST /api/store2/fulfill
 * Same body / auth shape as /api/fulfill but operates on Store 2 credentials
 * and logs with store_id = 2.
 */
export async function POST(req: Request) {
  return handleFulfillRequest(req, createStore2Fulfillment);
}
