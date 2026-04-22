import ExcelJS from "exceljs";
import type { CodRow } from "@/lib/cod/build-rows";

const HEADERS = [
  "Order Name",
  "UBEX ID",
  "Tracking URL",
  "Payment Method",
  "Outstanding Balance",
  "To Collect",
  "Customer Name",
  "Shipping Address",
  "Shipping Country",
] as const;

function ordinalDay(d: number): string {
  const mod10 = d % 10;
  const mod100 = d % 100;
  if (mod10 === 1 && mod100 !== 11) return `${d}st`;
  if (mod10 === 2 && mod100 !== 12) return `${d}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${d}rd`;
  return `${d}th`;
}

export function sheetTitleFromDate(d = new Date()): string {
  return `${ordinalDay(d.getDate())} ${d.toLocaleString("en-GB", { month: "long" })} ${d.getFullYear()}`;
}

export function codFilenameFromDate(d = new Date()): string {
  const dd = d.getDate().toString().padStart(2, "0");
  const mon = d.toLocaleString("en-GB", { month: "short" });
  const yyyy = d.getFullYear();
  return `COD_Seissense_${dd}-${mon}-${yyyy}.xlsx`;
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true, name: "Arial", size: 11 };
  row.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFB8CCE4" },
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });
}

export async function buildCodWorkbook(rows: CodRow[]): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  const title = sheetTitleFromDate();
  const ws = wb.addWorksheet(title.slice(0, 31));

  const header = ws.addRow([...HEADERS]);
  styleHeaderRow(header);

  for (const r of rows) {
    ws.addRow([
      r.orderName,
      r.ubexId,
      r.trackingUrl,
      r.paymentMethod,
      r.outstandingGbp,
      r.toCollect,
      r.customerName,
      r.shippingAddress,
      r.shippingCountry,
    ]);
  }

  ws.columns = [
    { width: 18 },
    { width: 14 },
    { width: 40 },
    { width: 26 },
    { width: 18 },
    { width: 16 },
    { width: 22 },
    { width: 44 },
    { width: 14 },
  ];

  return wb;
}

export async function workbookToBuffer(wb: ExcelJS.Workbook): Promise<Buffer> {
  const buf = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
  return Buffer.from(buf);
}
