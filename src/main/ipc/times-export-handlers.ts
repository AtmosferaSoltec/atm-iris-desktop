import { BrowserWindow, dialog } from "electron";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AppError } from "@shared/errors";
import { timesCsv, timesReportHtml } from "@shared/lib/times-export";
import type { IpcHandlers } from "./dispatch";
import type { TimingService } from "../services/timing-service";

const BOM = String.fromCharCode(0xfeff);

/** The HTML is printed by a hidden window with no scripts and no network. */
async function printPdf(html: string): Promise<Buffer> {
  const folder = await mkdtemp(join(tmpdir(), "iris-informe-"));
  const window = new BrowserWindow({
    show: false,
    webPreferences: { sandbox: true, javascript: false, contextIsolation: true },
  });
  try {
    const file = join(folder, "informe.html");
    await writeFile(file, html, "utf8");
    await window.loadFile(file);
    return await window.webContents.printToPDF({
      pageSize: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });
  } finally {
    window.destroy();
    await rm(folder, { recursive: true, force: true });
  }
}

export function timesExportHandlers(
  timing: TimingService,
  churchName: () => string,
): Pick<IpcHandlers, "records:export"> {
  return {
    "records:export": async ({ format, recordIds }) => {
      const times = timing.loadTimes();
      const wanted = new Set(recordIds);
      const records = times.records
        .filter((record) => wanted.has(record.id) && record.status === "finished")
        .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
      if (!records.length)
        throw new AppError("VALIDATION_FAILED", "No hay servicios terminados para descargar.");
      const data = {
        records,
        types: times.types,
        people: times.people,
        timeZone: times.timeZone,
        churchName: churchName(),
        generatedAt: new Date(),
      };
      const today = new Date().toISOString().slice(0, 10);
      const result = await dialog.showSaveDialog({
        title: format === "pdf" ? "Guardar informe de tiempos" : "Guardar tabla de tiempos",
        defaultPath: `tiempos-${today}.${format}`,
        filters:
          format === "pdf"
            ? [{ name: "Informe PDF", extensions: ["pdf"] }]
            : [{ name: "Tabla (CSV)", extensions: ["csv"] }],
      });
      if (result.canceled || !result.filePath) return { isCanceled: true, count: 0 };
      if (format === "pdf") await writeFile(result.filePath, await printPdf(timesReportHtml(data)));
      // The BOM makes Excel read the accents as UTF-8.
      else await writeFile(result.filePath, BOM + timesCsv(data), "utf8");
      return { isCanceled: false, count: records.length };
    },
  };
}
