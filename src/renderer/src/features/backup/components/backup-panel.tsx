import { Download, Upload } from "lucide-react";
import { useState, useTransition } from "react";
import { Banner } from "@renderer/components/ui/banner";
import { Button } from "@renderer/components/ui/button";
import { toast } from "@renderer/components/ui/toaster";
import { plural } from "@shared/lib/text";
import { exportBackup, importBackup } from "../actions";

/** Save the songs and YouTube links as a file, and bring them into this or another account. */
export function BackupPanel() {
  const [isExporting, startExport] = useTransition();
  const [isImporting, startImport] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function download() {
    setError(null);
    startExport(async () => {
      const result = await exportBackup();
      if (result.error) setError(result.error);
    });
  }

  function upload() {
    setError(null);
    startImport(async () => {
      const result = await importBackup();
      if (!result.result) {
        if (result.error) setError(result.error);
        return;
      }
      const { songs, youtubeVideos, skipped, withoutLyrics } = result.result;
      toast.success(
        `Se importaron ${plural(songs, "canción", "canciones")} y ${plural(youtubeVideos, "video de YouTube", "videos de YouTube")}` +
          (skipped ? `; ${skipped} ya estaban` : "") +
          (withoutLyrics ? `; ${withoutLyrics} eran solo pista y no se traen` : ""),
      );
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
          Descargar respaldo
        </Button>
        <Button
          variant="secondary"
          icon={<Upload className="size-4" />}
          onClick={upload}
          isLoading={isImporting}
        >
          Importar respaldo
        </Button>
      </div>
    </div>
  );
}
