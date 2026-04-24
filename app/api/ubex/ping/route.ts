import { NextResponse } from "next/server";
import { getUbexToken, ubexFetch } from "@/lib/ubex/client";

export const runtime = "nodejs";
// Cache for 60 s so the Topbar polling doesn't hammer Ubex
export const revalidate = 60;

export async function GET() {
  const token = getUbexToken();
  if (!token) {
    return NextResponse.json({ status: "unconfigured" }, { status: 200 });
  }
  try {
    const res = await ubexFetch("/api/meta/statuses");
    if (res.ok) {
      return NextResponse.json({ status: "ok" });
    }
    return NextResponse.json({ status: "error", code: res.status });
  } catch (e) {
    return NextResponse.json({ status: "error", detail: e instanceof Error ? e.message : "fetch failed" });
  }
}
