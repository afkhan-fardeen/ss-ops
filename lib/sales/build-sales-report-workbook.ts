import ExcelJS from "exceljs";
import type { DailySalesReport, StoreSalesSummary } from "@/lib/sales/daily-sales-report";

// Palette matches the portal (blue primary, teal for the GCC store).
const BLUE = "FF2563EB";
const TEAL = "FF0F766E";
const INK = "FF0F172A";
const MUTED = "FF5B6B82";
const HEADER_BG = "FFF1F5F9";
const ALT_ROW_BG = "FFF8FAFC";
const BORDER = "FFE2E8F0";
const STORE_ACCENT = [BLUE, TEAL];
const FONT = "Calibri";

function border(): Partial<ExcelJS.Borders> {
  const s = { style: "thin" as const, color: { argb: BORDER } };
  return { top: s, left: s, bottom: s, right: s };
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-GB", { timeZone: "Asia/Bahrain", hour: "2-digit", minute: "2-digit" });
}

function currencyFmt(currency: string): string {
  return `"${currency}" #,##0.00`;
}

function styleHeader(row: ExcelJS.Row, accent: string, rightFrom = 2) {
  row.height = 22;
  row.eachCell((cell, col) => {
    cell.font = { bold: true, name: FONT, size: 10, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: accent } };
    cell.alignment = { vertical: "middle", horizontal: col >= rightFrom ? "right" : "left" };
    cell.border = border();
  });
}

function addSummarySheet(wb: ExcelJS.Workbook, report: DailySalesReport) {
  const ws = wb.addWorksheet("Summary", { views: [{ showGridLines: false }] });
  ws.columns = [{ width: 30 }, { width: 10 }, { width: 11 }, { width: 11 }, { width: 18 }, { width: 18 }, { width: 18 }];

  ws.mergeCells("A1:G1");
  const title = ws.getCell("A1");
  title.value = "Daily sales report";
  title.font = { bold: true, size: 18, name: FONT, color: { argb: BLUE } };
  ws.getRow(1).height = 30;
  ws.mergeCells("A2:G2");
  const sub = ws.getCell("A2");
  sub.value = `${report.day.label}  ·  Bahrain calendar day  ·  cancelled and draft orders excluded`;
  sub.font = { size: 10, name: FONT, color: { argb: MUTED } };

  const header = ws.getRow(4);
  ["Store", "Currency", "Orders", "Units", "Total sales", "Discounts", "Avg. order value"].forEach((h, i) => (header.getCell(i + 1).value = h));
  styleHeader(header, BLUE, 3);

  report.stores.forEach((s, i) => {
    const r = ws.getRow(5 + i);
    const avg = s.orderCount > 0 ? s.totalSales / s.orderCount : 0;
    [s.store, s.currency, s.orderCount, s.unitsSold, s.totalSales, s.totalDiscounts, avg].forEach((v, c) => (r.getCell(c + 1).value = v));
    r.eachCell((cell, col) => {
      cell.font = { name: FONT, size: 10, bold: col === 1, color: { argb: INK } };
      cell.alignment = { vertical: "middle", horizontal: col >= 3 ? "right" : "left" };
      cell.border = border();
      if (i % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW_BG } };
    });
    r.getCell(1).font = { name: FONT, size: 10, bold: true, color: { argb: STORE_ACCENT[i % 2]! } };
    for (const col of [5, 6, 7]) r.getCell(col).numFmt = currencyFmt(s.currency);
    r.height = 20;
  });
  ws.addRow([]);
  const note = ws.addRow(["Amounts are in each store's own currency and are not added together."]);
  note.getCell(1).font = { italic: true, size: 9, name: FONT, color: { argb: MUTED } };
}

function addStoreSheet(wb: ExcelJS.Workbook, dayLabel: string, s: StoreSalesSummary, accent: string) {
  const ws = wb.addWorksheet(s.store.slice(0, 31), { views: [{ showGridLines: false }] });
  ws.properties.tabColor = { argb: accent };
  ws.columns = [{ width: 34 }, { width: 12 }, { width: 16 }, { width: 16 }];

  ws.mergeCells("A1:D1");
  const title = ws.getCell("A1");
  title.value = s.store;
  title.font = { bold: true, size: 16, name: FONT, color: { argb: accent } };
  ws.getRow(1).height = 28;
  ws.mergeCells("A2:D2");
  ws.getCell("A2").value = `${dayLabel}  ·  ${s.currency}`;
  ws.getCell("A2").font = { size: 10, name: FONT, color: { argb: MUTED } };

  // KPI block
  const avg = s.orderCount > 0 ? s.totalSales / s.orderCount : 0;
  const kpis: [string, number, string | null][] = [
    ["Total sales", s.totalSales, currencyFmt(s.currency)],
    ["Orders", s.orderCount, "0"],
    ["Units sold", s.unitsSold, "0"],
    ["Avg. order value", avg, currencyFmt(s.currency)],
    ["Discounts given", s.totalDiscounts, currencyFmt(s.currency)],
  ];
  kpis.forEach(([label, value, fmt], i) => {
    const row = ws.getRow(4 + i);
    const l = row.getCell(1);
    l.value = label;
    l.font = { bold: true, name: FONT, size: 10, color: { argb: MUTED } };
    l.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
    l.border = border();
    const v = row.getCell(2);
    ws.mergeCells(4 + i, 2, 4 + i, 3);
    v.value = value;
    v.numFmt = fmt ?? "General";
    v.font = { bold: true, name: FONT, size: 11, color: { argb: INK } };
    v.alignment = { horizontal: "right" };
    v.border = border();
  });

  // Top products
  let r = 10;
  ws.getCell(r, 1).value = "Top products";
  ws.getCell(r, 1).font = { bold: true, size: 12, name: FONT, color: { argb: INK } };
  r += 1;
  const ph = ws.getRow(r);
  ["Product", "Units", "Sales", ""].forEach((h, i) => (ph.getCell(i + 1).value = h || undefined));
  styleHeader(ph, accent);
  ph.getCell(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: accent } };
  if (s.topProducts.length === 0) {
    r += 1;
    ws.getCell(r, 1).value = "No sales recorded for this day.";
    ws.getCell(r, 1).font = { italic: true, size: 10, name: FONT, color: { argb: MUTED } };
  }
  s.topProducts.forEach((p, i) => {
    r += 1;
    const row = ws.getRow(r);
    row.getCell(1).value = p.name;
    row.getCell(2).value = p.unitsSold;
    row.getCell(3).value = p.salesAmount;
    row.getCell(3).numFmt = currencyFmt(s.currency);
    row.eachCell({ includeEmpty: false }, (cell, col) => {
      cell.font = { name: FONT, size: 10, color: { argb: INK } };
      cell.alignment = { vertical: "middle", horizontal: col === 1 ? "left" : "right", wrapText: col === 1 };
      cell.border = border();
      if (i % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW_BG } };
    });
  });

  // Orders table with totals
  r += 3;
  ws.getCell(r, 1).value = `Orders (${s.orders.length})`;
  ws.getCell(r, 1).font = { bold: true, size: 12, name: FONT, color: { argb: INK } };
  r += 1;
  const headerRowIdx = r;
  const oh = ws.getRow(r);
  ["Order", "Time", `Amount (${s.currency})`, `Discount (${s.currency})`].forEach((h, i) => (oh.getCell(i + 1).value = h));
  styleHeader(oh, accent, 2);
  const firstData = r + 1;
  s.orders.forEach((o, i) => {
    r += 1;
    const row = ws.getRow(r);
    row.getCell(1).value = o.orderName;
    row.getCell(2).value = formatTime(o.createdAt);
    row.getCell(3).value = o.amount;
    row.getCell(4).value = o.discount;
    row.eachCell({ includeEmpty: false }, (cell, col) => {
      cell.font = { name: FONT, size: 10, color: { argb: INK } };
      cell.alignment = { vertical: "middle", horizontal: col === 1 ? "left" : "right" };
      cell.border = border();
      if (i % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW_BG } };
    });
    row.getCell(3).numFmt = "#,##0.00";
    row.getCell(4).numFmt = "#,##0.00";
  });
  if (s.orders.length > 0) {
    const lastData = r;
    r += 1;
    const total = ws.getRow(r);
    total.getCell(1).value = "Total";
    total.getCell(3).value = { formula: `SUM(C${firstData}:C${lastData})`, result: s.totalSales };
    total.getCell(4).value = { formula: `SUM(D${firstData}:D${lastData})`, result: s.totalDiscounts };
    total.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.font = { bold: true, name: FONT, size: 10, color: { argb: INK } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
      cell.border = border();
      cell.alignment = { horizontal: col === 1 ? "left" : "right" };
    });
    total.getCell(3).numFmt = "#,##0.00";
    total.getCell(4).numFmt = "#,##0.00";
    ws.autoFilter = { from: { row: headerRowIdx, column: 1 }, to: { row: lastData, column: 4 } };
  }
  ws.pageSetup = { orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
}

export async function buildSalesReportWorkbook(report: DailySalesReport): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Seissense Ops";
  wb.created = new Date();
  addSummarySheet(wb, report);
  report.stores.forEach((store, i) => addStoreSheet(wb, report.day.label, store, STORE_ACCENT[i % 2]!));
  return wb;
}

/** `Sales_Report_12-09-2026.xlsx` from a Bahrain `dateKey` (YYYY-MM-DD). */
export function salesReportFilename(dateKey: string): string {
  const [y, m, d] = dateKey.split("-");
  return `Sales_Report_${d}-${m}-${y}.xlsx`;
}
