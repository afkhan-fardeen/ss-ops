import { redirect } from "next/navigation";

/** Legacy route — fulfillment history moved under /fulfillment/history */
export default function HistoryRedirectPage() {
  redirect("/fulfillment/history");
}
