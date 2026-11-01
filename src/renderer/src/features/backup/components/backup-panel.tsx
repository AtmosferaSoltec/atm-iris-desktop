import { Download } from "lucide-react";
import { useState, useTransition } from "react";
import { Banner } from "@renderer/components/ui/banner";
import { Button } from "@renderer/components/ui/button";
import { exportBackup } from "../actions";
import { ExportFilesButton } from "./export-files-button";
import { SongImportButton } from "./song-import-button";

export function BackupPanel() {
  const [isExporting, startExport] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function download() {
    setError(null);
    startExport(async () => {
      const result = await exportBackup();
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <Banner tone="error">{error}</Banner>}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="secondary"
          icon={<Download className="size-4" />}
          onClick={download}
          isLoading={isExporting}
        >
          Descargar canciones (letras)
        </Button>
        <SongImportButton onError={setError} />
        <ExportFilesButton onError={setError} />
      </div>
    </div>
  );
}
