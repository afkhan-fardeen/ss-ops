import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Legacy route: date selection lives on /cod-list */
export default function CodHistoryRedirect() {
  redirect("/cod-list");
}
