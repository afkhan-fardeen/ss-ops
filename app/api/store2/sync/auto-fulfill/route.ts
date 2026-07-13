import { NextResponse, type NextRequest } from "next/server";
import {
  getPendingOrderUbexLinks,
  markOrderAutoFulfilled,
  updateUbexStatus,
} from "@/lib/supabase/order-ubex-links";
import { startCronRun, completeCronRun } from "@/lib/supabase/cron-run-log";
import { createStore2Fulfillment } from "@/lib/store2/fulfill-order";
import { fetchShipmentDetails } from "@/lib/ubex/shipment-details";
import { resolveTrackingUrl } from "@/lib/ubex/tracking-url";
import {
  sendFulfillmentNotification,
  sendErrorNotification,
} from "@/lib/email/send-fulfillment-notification";

/**
 * POST /api/store2/sync/auto-fulfill
 *
 * Mirrors /api/sync/auto-fulfill but operates on Store 2.
 * Queries pending links with store_id = 2 and pushes via Store 2 credentials.
 *
 * Auth: expects  Authorization: Bearer <CRON_SECRET>
 */

const FULFILLED_STATUS =
  (process.env.UBEX_FULFILLED_STATUS ?? "Order Fulfilled").trim() || "Order Fulfilled";

const BATCH_CONCURRENCY = 5;

type SyncResult = {
  order: string;
  tracking: string;
  ubexStatus: string;
  action: "fulfilled" | "already-fulfilled" | "skipped" | "error";
  detail?: string;
};

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const dryRun = req.nextUrl.searchParams.get("dry_run") === "true";

  const runId = await startCronRun(dryRun, "/api/store2/sync/auto-fulfill");

  const links = await getPendingOrderUbexLinks({ storeId: 2 });
  if (links.length === 0) {
    if (runId) await completeCronRun(runId, { status: "success", checked: 0, fulfilled: 0, skipped: 0, errors: 0 });
    return NextResponse.json({
      ok: true,
      store: 2,
      dry_run: dryRun,
      checked: 0,
      fulfilled: 0,
      skipped: 0,
      errors: 0,
    });
  }

  let fulfilled = 0;
  let skipped = 0;
  let errors = 0;
  const results: SyncResult[] = [];

  for (let i = 0; i < links.length; i += BATCH_CONCURRENCY) {
    const batch = links.slice(i, i + BATCH_CONCURRENCY);
    await Promise.all(
      batch.map(async (link) => {
        const { shopify_order_id, shopify_order_name, ubex_tracking } = link;
        try {
          const details = await fetchShipmentDetails(ubex_tracking);
          const ubexStatus = typeof details?.status === "string" ? details.status.trim() : "";

          if (ubexStatus && !dryRun) {
            void updateUbexStatus(shopify_order_id, ubexStatus).catch(() => {});
          }

          if (!ubexStatus || ubexStatus !== FULFILLED_STATUS) {
            skipped++;
            results.push({
              order: shopify_order_name,
              tracking: ubex_tracking,
              ubexStatus: ubexStatus || "unknown",
              action: "skipped",
            });
            return;
          }

          const trackingUrl = resolveTrackingUrl(
            ubex_tracking,
            typeof details?.tracking_url === "string" ? details.tracking_url : undefined,
          );

          if (dryRun) {
            fulfilled++;
            results.push({
              order: shopify_order_name,
              tracking: ubex_tracking,
              ubexStatus,
              action: "fulfilled",
              detail: `[DRY RUN] would fulfill with trackingUrl=${trackingUrl || "(template)"}`,
            });
            return;
          }

          const result = await createStore2Fulfillment({
            orderId: shopify_order_id,
            orderName: shopify_order_name,
            trackingNumber: ubex_tracking,
            trackingUrl: trackingUrl || undefined,
            createdBy: "seissense-ops-bot",
          });

          if (result.ok) {
            void markOrderAutoFulfilled(shopify_order_id, ubexStatus).catch(() => {});
            fulfilled++;
            results.push({
              order: shopify_order_name,
              tracking: ubex_tracking,
              ubexStatus,
              action: result.idempotent ? "already-fulfilled" : "fulfilled",
            });
          } else {
            errors++;
            results.push({
              order: shopify_order_name,
              tracking: ubex_tracking,
              ubexStatus,
              action: "error",
              detail: result.error,
            });
          }
        } catch (e) {
          errors++;
          results.push({
            order: shopify_order_name,
            tracking: ubex_tracking,
            ubexStatus: "error",
            action: "error",
            detail: e instanceof Error ? e.message : String(e),
          });
        }
      }),
    );
  }

  console.log(
    `[store2-auto-fulfill] dry_run=${dryRun} checked=${links.length} fulfilled=${fulfilled} skipped=${skipped} errors=${errors}`,
  );

  if (runId) {
    await completeCronRun(runId, {
      status: errors > 0 && fulfilled === 0 ? "error" : "success",
      checked: links.length,
      fulfilled,
      skipped,
      errors,
    });
  }

  const fulfilledOrders = results
    .filter((r) => r.action === "fulfilled")
    .map((r) => ({ order: r.order, tracking: r.tracking, trackingUrl: undefined as string | undefined }));

  const failedOrders = results
    .filter((r) => r.action === "error")
    .map((r) => ({ order: r.order, tracking: r.tracking, detail: r.detail }));

  await Promise.allSettled([
    fulfilledOrders.length > 0
      ? sendFulfillmentNotification({
          fulfilled: fulfilledOrders,
          skipped,
          checked: links.length,
          dryRun,
        })
      : Promise.resolve(),
    failedOrders.length > 0
      ? sendErrorNotification({
          errors: failedOrders,
          fulfilled,
          checked: links.length,
        })
      : Promise.resolve(),
  ]);

  return NextResponse.json({
    ok: true,
    store: 2,
    dry_run: dryRun,
    checked: links.length,
    fulfilled,
    skipped,
    errors,
    results,
  });
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  return NextResponse.json({
    ok: true,
    store: 2,
    fulfilledStatus: FULFILLED_STATUS,
    info: "POST this endpoint to trigger a Store 2 sync run.",
  });
}
