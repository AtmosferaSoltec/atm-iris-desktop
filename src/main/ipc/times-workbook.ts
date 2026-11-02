import ExcelJS from "exceljs";
import { rangeLabel, timesTable, type ExportData } from "@shared/lib/times-export";

const INK = "FF1C1B22";
const ACCENT = "FFFF7A59";
const BAND = "FFF6F4F2";
const GREEN = "FF17714A";
const RED = "FFA8312A";

/** Minutes and seconds past the plan ("+1:40"), or "A tiempo" when there is none. */
const OVERTIME = '"+"[m]:ss;;"A tiempo"';

/** The sheet people open in Excel: a title, then one row per block with real dates and durations. */
export async function timesWorkbook(data: ExportData): Promise<Buffer> {
  const rows = timesTable(data);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Iris";
  const sheet = workbook.addWorksheet("Tiempos", {
    views: [{ state: "frozen", ySplit: 3, showGridLines: false }],
  });
  sheet.columns = [
    { key: "date", width: 13 },
    { key: "service", width: 22 },
    { key: "block", width: 30 },
    { key: "leader", width: 22 },
    { key: "startTime", width: 13 },
    { key: "endTime", width: 13 },
    { key: "overtime", width: 16 },
  ];

  sheet.mergeCells("A1:G1");
  const title = sheet.getCell("A1");
  title.value = `${data.churchName || "Iris"} · Tiempos de servicio · ${rangeLabel(data.records, data.timeZone)}`;
  title.font = { name: "Calibri", size: 16, bold: true, color: { argb: INK } };
  title.alignment = { vertical: "middle" };
  sheet.getRow(1).height = 30;
  sheet.getRow(2).height = 6;

  const header = sheet.getRow(3);
  header.values = [
    "Fecha",
    "Servicio",
    "Bloque",
    "Responsable",
    "Hora inicio",
    "Hora fin",
    "Excedente",
  ];
  header.height = 22;
  header.eachCell((cell, column) => {
    cell.font = { name: "Calibri", bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: INK } };
    cell.alignment = { vertical: "middle", horizontal: column >= 5 ? "right" : "left" };
    cell.border = { bottom: { style: "medium", color: { argb: ACCENT } } };
  });

  // Rows of the same service share a shade, so each service reads as one group.
  let isBanded = false;
  let previous: Date | null = null;
  for (const row of rows) {
    if (!previous || previous.getTime() !== row.date.getTime()) isBanded = !isBanded;
    previous = row.date;
    const added = sheet.addRow({
      ...row,
      startTime: row.startTime ?? "",
      endTime: row.endTime ?? "",
      overtime: row.overtime ?? "Omitido",
    });
    added.height = 18;
    added.getCell("date").numFmt = "dd/mm/yyyy";
    added.getCell("startTime").numFmt = "h:mm:ss AM/PM";
    added.getCell("endTime").numFmt = "h:mm:ss AM/PM";
    added.getCell("overtime").numFmt = OVERTIME;
    added.eachCell((cell, column) => {
      cell.font = { name: "Calibri", color: { argb: INK } };
      cell.alignment = { vertical: "middle", horizontal: column >= 5 ? "right" : "left" };
      cell.border = { bottom: { style: "thin", color: { argb: "FFE3E0DC" } } };
      if (isBanded) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BAND } };
    });
    const overtime = added.getCell("overtime");
    if (row.overtime === null)
      overtime.font = { name: "Calibri", italic: true, color: { argb: "FF8D8B96" } };
    else
      overtime.font = {
        name: "Calibri",
        bold: true,
        color: { argb: row.overtime > 0 ? RED : GREEN },
      };
  }

  sheet.autoFilter = { from: "A3", to: `G${Math.max(3, sheet.rowCount)}` };
  sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
