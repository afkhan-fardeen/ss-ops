/** Store 2 fulfillment. Thin wrapper around lib/shopify/fulfill-order.ts's shared
 *  push logic, using Store 2 credentials and store_id: 2 for all Supabase helpers. */

import { createFulfillmentForStore, type CreateFulfillmentInput, type CreateFulfillmentResult } from "@/lib/shopify/fulfill-order";
import { getStore2Env, store2Fetch } from "./client";

export type CreateStore2FulfillmentInput = CreateFulfillmentInput;
export type CreateStore2FulfillmentResult = CreateFulfillmentResult;

export async function createStore2Fulfillment(
  input: CreateStore2FulfillmentInput,
): Promise<CreateStore2FulfillmentResult> {
  const env = getStore2Env();
  return createFulfillmentForStore(store2Fetch, env, 2, input);
}
