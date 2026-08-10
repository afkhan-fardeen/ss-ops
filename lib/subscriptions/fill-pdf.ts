import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { SubscriptionRequestRow } from "./types";
import { ENTITY_OPTIONS } from "./types";
import { paymentOptionLabel } from "./constants";

const PAGE_H = 841.92;

/** Convert top-down y (from PyMuPDF) to pdf-lib bottom-up y. */
function yFromTop(top: number, lineOffset = 12): number {
  return PAGE_H - top - lineOffset;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return new Date().toLocaleDateString("en-GB");
  try {
    return new Date(iso).toLocaleDateString("en-GB");
  } catch {
    return iso;
  }
}

function formatAmount(amount: number, currency: string): string {
  return `${currency} ${amount.toFixed(2)}`;
}

function billingLabel(row: SubscriptionRequestRow): string {
  if (row.billing_cycle === "other" && row.billing_cycle_other) {
    return row.billing_cycle_other;
  }
  switch (row.billing_cycle) {
    case "monthly":
      return "Monthly";
    case "yearly":
      return "Annually";
    case "one_time":
      return "One-Time";
    default:
      return row.billing_cycle_other ?? "Other";
  }
}

type DrawOpts = { x: number; yTop: number; size?: number; maxWidth?: number; lineOffset?: number };

async function drawField(
  page: ReturnType<PDFDocument["getPages"]>[0],
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  text: string,
  { x, yTop, size = 10, maxWidth = 320, lineOffset = 12 }: DrawOpts,
) {
  const value = text.trim();
  if (!value) return;
  let drawText = value;
  if (maxWidth && font.widthOfTextAtSize(drawText, size) > maxWidth) {
    while (drawText.length > 3 && font.widthOfTextAtSize(`${drawText}…`, size) > maxWidth) {
      drawText = drawText.slice(0, -1);
    }
    drawText = `${drawText}…`;
  }
  page.drawText(drawText, {
    x,
    y: yFromTop(yTop, lineOffset),
    size,
    font,
    color: rgb(0.1, 0.1, 0.1),
  });
}

function drawCheck(
  page: ReturnType<PDFDocument["getPages"]>[0],
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  x: number,
  yTop: number,
  checked: boolean,
) {
  if (!checked) return;
  page.drawText("X", {
    x: x + 2,
    y: yFromTop(yTop, 10),
    size: 11,
    font,
    color: rgb(0.1, 0.1, 0.1),
  });
}

function wrapJustification(
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  text: string,
  maxWidth: number,
  size: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

export async function fillSubscriptionPdf(row: SubscriptionRequestRow): Promise<Uint8Array> {
  const templatePath = path.join(process.cwd(), "assets/subscriptions/template.pdf");
  const bytes = fs.readFileSync(templatePath);
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const pages = doc.getPages();

  const page1 = pages[0]!;
  const page2 = pages[1] ?? pages[0]!;

  // Form No. / Date row label sits at ~y 157–167 (9pt); use smaller offset so values sit on the blanks.
  const refShort = row.reference_number.replace(/^SUB-\d+-/, "SUB-");
  await drawField(page1, fontBold, refShort, {
    x: 390,
    yTop: 157,
    size: 9,
    lineOffset: 5,
  });
  await drawField(page1, font, formatDate(row.submitted_at), {
    x: 478,
    yTop: 157,
    size: 9,
    lineOffset: 5,
  });

  await drawField(page1, font, row.subscription_name, { x: 220, yTop: 288 });
  await drawField(page1, font, row.vendor ?? "", { x: 220, yTop: 316 });

  // Label sits at y≈337; write answer below it so it doesn't overlap the heading.
  if (row.justification) {
    const lines = wrapJustification(font, row.justification, 300, 10);
    for (let i = 0; i < lines.length; i++) {
      page1.drawText(lines[i]!, {
        x: 220,
        y: yFromTop(358 + i * 14),
        size: 10,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });
    }
  }

  for (const entity of ENTITY_OPTIONS) {
    const yMap: Record<string, number> = {
      "Seissense W.L.L. (Bahrain)": 411,
      "Sense Wellness W.L.L. (Bahrain)": 426,
      "Seissense FZE (UAE)": 440,
      "Sensewellness FZE (UAE)": 455,
      "Sense Wellness Company Ltd / Love Boo (UK)": 469,
      "Seissense Company Limited (UK)": 484,
    };
    const yTop = yMap[entity];
    if (yTop != null) {
      drawCheck(page1, font, 54, yTop, row.entity_billed === entity);
    }
  }

  await drawField(page1, font, formatAmount(Number(row.amount), row.currency), {
    x: 220,
    yTop: 515,
  });

  drawCheck(page1, font, 54, 554, row.billing_cycle === "monthly");
  drawCheck(page1, font, 114, 554, row.billing_cycle === "yearly");
  drawCheck(page1, font, 176, 554, row.billing_cycle === "one_time");
  if (row.billing_cycle === "other") {
    drawCheck(page1, font, 243, 554, true);
    await drawField(page1, font, row.billing_cycle_other ?? "", { x: 290, yTop: 554, maxWidth: 120 });
  }

  await drawField(page1, font, row.employee_email, { x: 220, yTop: 624 });
  await drawField(page1, font, row.employee_name, { x: 220, yTop: 668 });
  const deptPos = [row.department, row.job_title].filter(Boolean).join(" — ");
  await drawField(page1, font, deptPos, { x: 220, yTop: 696 });
  await drawField(page1, font, paymentOptionLabel(row.payment_method), { x: 220, yTop: 724 });

  await drawField(page2, font, row.employee_name, { x: 220, yTop: 111 });
  await drawField(page2, font, row.department ?? "", { x: 220, yTop: 139 });
  await drawField(page2, font, formatDate(row.submitted_at), { x: 220, yTop: 195 });

  if (row.status === "approved" && row.approved_by_name) {
    await drawField(page2, font, row.approved_by_name, { x: 220, yTop: 264 });
    drawCheck(page2, font, 54, 331, true);
    await drawField(page2, font, formatDate(row.approved_at), { x: 220, yTop: 446 });
  } else if (row.status === "rejected") {
    await drawField(page2, font, row.rejected_by_name ?? "", { x: 220, yTop: 264 });
    drawCheck(page2, font, 119, 331, true);
    if (row.rejection_reason) {
      const lines = wrapJustification(font, row.rejection_reason, 300, 10);
      for (let i = 0; i < lines.length; i++) {
        page2.drawText(lines[i]!, {
          x: 220,
          y: yFromTop(355 + i * 14),
          size: 10,
          font,
          color: rgb(0.1, 0.1, 0.1),
        });
      }
    }
  }

  return doc.save();
}

/** Regenerate PDF after approval/rejection updates management section. */
export async function regenerateSubscriptionPdf(row: SubscriptionRequestRow): Promise<Uint8Array> {
  return fillSubscriptionPdf(row);
}
