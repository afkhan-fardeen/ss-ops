import ExcelJS from "exceljs";
import type { UbexInventoryItem } from "@/lib/ubex/inventory";

const HEADER_BG = "FF1E3A5F"; // dark navy
const HEADER_FG = "FFFFFFFF"; // white
const ALT_ROW_BG = "FFF0F4FA"; // very light blue
const BORDER_CLR = "FFD0D8E4"; // soft slate

function applyThinBorder(cell: ExcelJS.Cell) {
  const side: ExcelJS.BorderStyle = "thin";
  cell.border = {
    top: { style: side, color: { argb: BORDER_CLR } },
    left: { style: side, color: { argb: BORDER_CLR } },
    bottom: { style: side, color: { argb: BORDER_CLR } },
    right: { style: side, color: { argb: BORDER_CLR } },
  };
}

const HEADERS = ["Product", "SKU", "Barcode", "Size", "Color", "Ubex Stock"];

/** Builds a single-sheet, filterable Excel export of the full Ubex catalog's quantities. */
export async function buildUbexInventoryWorkbook(items: UbexInventoryItem[]): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Seissense Ops";
  wb.created = new Date();

  const ws = wb.addWorksheet("Inventory", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  ws.columns = HEADERS.map((h) => ({ width: h === "Product" ? 36 : 18 }));

  const headerRow = ws.getRow(1);
  headerRow.height = 22;
  HEADERS.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, name: "Calibri", size: 11, color: { argb: HEADER_FG } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
    cell.alignment = { vertical: "middle", horizontal: i < 5 ? "left" : "right" };
    applyThinBorder(cell);
  });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: HEADERS.length } };

  items.forEach((item, i) => {
    const row = ws.addRow([item.name, item.sku, item.barcode, item.size ?? "", item.color ?? "", item.stock]);
    const isAlt = i % 2 === 1;
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.font = { name: "Calibri", size: 10 };
      cell.alignment = { vertical: "middle", horizontal: col <= 5 ? "left" : "right" };
      if (isAlt) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW_BG } };
      applyThinBorder(cell);
    });
  });

  return wb;
}

/** `Ubex_Inventory_11-10-2026.xlsx` — current Bahrain-local date. */
export function ubexInventoryFilename(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bahrain",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(now);
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  return `Ubex_Inventory_${d}-${m}-${y}.xlsx`;
}
