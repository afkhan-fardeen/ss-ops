import ExcelJS from "exceljs";
import type { CodRow } from "@/lib/cod/build-rows";

// ─── column definitions (no Tracking URL) ────────────────────────────────────
const COLUMNS: { header: string; key: keyof CodRow | "orderDateFormatted"; width: number }[] = [
  { header: "Order",              key: "orderName",          width: 20  },
  { header: "Order Date",         key: "orderDateFormatted", width: 18  },
  { header: "UBEX ID",            key: "ubexId",             width: 20  },
  { header: "Outstanding (GBP)",  key: "outstandingGbp",     width: 22  },
  { header: "To Collect",         key: "toCollect",          width: 20  },
  { header: "Customer",           key: "customerName",       width: 28  },
  { header: "Shipping Address",   key: "shippingAddress",    width: 62  },
  { header: "Country",            key: "shippingCountry",    width: 14  },
];

// Brand colours
const HEADER_BG   = "FF1E3A5F";  // dark navy
const HEADER_FG   = "FFFFFFFF";  // white
const ALT_ROW_BG  = "FFF0F4FA";  // very light blue
const BORDER_CLR  = "FFD0D8E4";  // soft slate

function ordinalDay(d: number): string {
  const mod10 = d % 10, mod100 = d % 100;
  if (mod10 === 1 && mod100 !== 11) return `${d}st`;
  if (mod10 === 2 && mod100 !== 12) return `${d}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${d}rd`;
  return `${d}th`;
}

export function sheetTitleFromDate(d = new Date()): string {
  return `${ordinalDay(d.getDate())} ${d.toLocaleString("en-GB", { month: "long" })} ${d.getFullYear()}`;
}

export function codFilenameFromDate(d = new Date()): string {
  const dd   = d.getDate().toString().padStart(2, "0");
  const mon  = d.toLocaleString("en-GB", { month: "short" });
  const yyyy = d.getFullYear();
  return `COD_Seissense_${dd}-${mon}-${yyyy}.xlsx`;
}

function formatOrderDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function applyThinBorder(cell: ExcelJS.Cell) {
  const side: ExcelJS.BorderStyle = "thin";
  cell.border = {
    top:    { style: side, color: { argb: BORDER_CLR } },
    left:   { style: side, color: { argb: BORDER_CLR } },
    bottom: { style: side, color: { argb: BORDER_CLR } },
    right:  { style: side, color: { argb: BORDER_CLR } },
  };
}

export async function buildCodWorkbook(rows: CodRow[]): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator  = "Seissense Ops";
  wb.created  = new Date();

  const title = sheetTitleFromDate();
  const ws = wb.addWorksheet(title.slice(0, 31), {
    views: [{ state: "frozen", ySplit: 1 }],  // freeze header row
  });

  // ── column widths ──────────────────────────────────────────────────────────
  ws.columns = COLUMNS.map((c) => ({ header: c.header, width: c.width }));

  // ── header row ─────────────────────────────────────────────────────────────
  const headerRow = ws.getRow(1);
  headerRow.height = 28;
  COLUMNS.forEach((_, colIdx) => {
    const cell = headerRow.getCell(colIdx + 1);
    cell.font  = { bold: true, name: "Calibri", size: 11, color: { argb: HEADER_FG } };
    cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: false };
    applyThinBorder(cell);
  });

  // ── auto filter on header ──────────────────────────────────────────────────
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to:   { row: 1, column: COLUMNS.length },
  };

  // ── data rows ──────────────────────────────────────────────────────────────
  rows.forEach((r, i) => {
    const rowData = [
      r.orderName,
      formatOrderDate(r.orderDate),
      r.ubexId || "—",
      r.outstandingGbp,
      r.toCollect,
      r.customerName,
      r.shippingAddress,
      r.shippingCountry,
    ];
    const dataRow = ws.addRow(rowData);
    dataRow.height = 36;

    const isAlt = i % 2 === 1;
    dataRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
      cell.font = { name: "Calibri", size: 10 };
      cell.alignment = { vertical: "middle", wrapText: colNum === 7 }; // wrap address only
      if (isAlt) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW_BG } };
      }
      applyThinBorder(cell);
    });

    // Right-align numeric columns (Outstanding, To Collect)
    dataRow.getCell(4).alignment = { horizontal: "right", vertical: "middle" };
    dataRow.getCell(5).alignment = { horizontal: "right", vertical: "middle" };
    // Center country
    dataRow.getCell(8).alignment = { horizontal: "center", vertical: "middle" };
  });

  // ── summary row at the bottom ──────────────────────────────────────────────
  if (rows.length > 0) {
    ws.addRow([]); // blank spacer
    const summaryRow = ws.addRow([
      `Total: ${rows.length} orders`,
      "", "", "", "", "", "", "",
    ]);
    summaryRow.getCell(1).font = { bold: true, name: "Calibri", size: 10, italic: true };
    summaryRow.getCell(1).alignment = { horizontal: "left" };
  }

  return wb;
}

export async function workbookToBuffer(wb: ExcelJS.Workbook): Promise<Buffer> {
  const buf = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
  return Buffer.from(buf);
}
