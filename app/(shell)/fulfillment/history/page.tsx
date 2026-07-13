import { FulfillmentHistoryContent } from "@/lib/fulfillment/load-fulfillment-history-page";

export const revalidate = 30;

export default function FulfillmentHistoryPage() {
  return <FulfillmentHistoryContent />;
}
