import ExcelJS from "exceljs";
import type { DailySalesReport, StoreSalesSummary } from "@/lib/sales/daily-sales-report";

const HEADER_BG = "FF1E3A5F"; // dark navy
const HEADER_FG = "FFFFFFFF"; // white
const ALT_ROW_BG = "FFF0F4FA"; // very light blue
const BORDER_CLR = "FFD0D8E4"; // soft slate
const LABEL_BG = "FFF7F7F7";

function applyThinBorder(cell: ExcelJS.Cell) {
  const side: ExcelJS.BorderStyle = "thin";
  cell.border = {
    top: { style: side, color: { argb: BORDER_CLR } },
    left: { style: side, color: { argb: BORDER_CLR } },
    bottom: { style: side, color: { argb: BORDER_CLR } },
    right: { style: side, color: { argb: BORDER_CLR } },
  };
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Bahrain",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function addStoreSheet(wb: ExcelJS.Workbook, dayLabel: string, summary: StoreSalesSummary) {
  const ws = wb.addWorksheet(summary.store.slice(0, 31), {
    views: [{ state: "frozen", ySplit: 6 }],
  });
  ws.columns = [
    { width: 22 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
  ];

  ws.mergeCells("A1:D1");
  const titleCell = ws.getCell("A1");
  titleCell.value = `${summary.store} — ${dayLabel}`;
  titleCell.font = { bold: true, size: 14, name: "Calibri", color: { argb: "FF111111" } };
  ws.getRow(1).height = 26;

  const summaryLabels: [string, string][] = [
    ["Orders", String(summary.orderCount)],
    ["Units sold", String(summary.unitsSold)],
    ["Total sales", `${summary.currency} ${summary.totalSales.toFixed(2)}`],
    ["Discounts given", `${summary.currency} ${summary.totalDiscounts.toFixed(2)}`],
  ];
  summaryLabels.forEach(([label, value], i) => {
    const row = ws.getRow(2 + i);
    const labelCell = row.getCell(1);
    labelCell.value = label;
    labelCell.font = { bold: true, name: "Calibri", size: 10 };
    labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LABEL_BG } };
    applyThinBorder(labelCell);
    const valueCell = row.getCell(2);
    valueCell.value = value;
    valueCell.font = { name: "Calibri", size: 10 };
    applyThinBorder(valueCell);
  });

  const headerRowIdx = 7;
  const headerRow = ws.getRow(headerRowIdx);
  headerRow.height = 22;
  ["Order", "Time", "Amount", "Discount"].forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, name: "Calibri", size: 11, color: { argb: HEADER_FG } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
    cell.alignment = { vertical: "middle", horizontal: i === 0 ? "left" : "right" };
    applyThinBorder(cell);
  });
  ws.autoFilter = { from: { row: headerRowIdx, column: 1 }, to: { row: headerRowIdx, column: 4 } };

  summary.orders.forEach((o, i) => {
    const row = ws.addRow([o.orderName, formatTime(o.createdAt), o.amount, o.discount]);
    const isAlt = i % 2 === 1;
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.font = { name: "Calibri", size: 10 };
      cell.alignment = { vertical: "middle", horizontal: col === 1 ? "left" : "right" };
      if (isAlt) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW_BG } };
      applyThinBorder(cell);
    });
    row.getCell(3).numFmt = "0.00";
    row.getCell(4).numFmt = "0.00";
  });
}

export async function buildSalesReportWorkbook(report: DailySalesReport): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Seissense Ops";
  wb.created = new Date();
  for (const store of report.stores) {
    addStoreSheet(wb, report.day.label, store);
  }
  return wb;
}

/** `Sales_Report_12-09-2026.xlsx` from a Bahrain `dateKey` (YYYY-MM-DD). */
export function salesReportFilename(dateKey: string): string {
  const [y, m, d] = dateKey.split("-");
  return `Sales_Report_${d}-${m}-${y}.xlsx`;
}
