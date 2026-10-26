import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog } from "@renderer/components/ui/dialog";
import { Banner } from "@renderer/components/ui/banner";
import { Button } from "@renderer/components/ui/button";
import { TextField } from "@renderer/components/ui/text-field";
import { NativeSelect } from "@renderer/components/ui/select";
import { SegmentedControl } from "@renderer/components/ui/segmented-control";
import { Spinner } from "@renderer/components/ui/spinner";
import { invoke } from "@renderer/lib/ipc";
import { errorMessage } from "@shared/errors";
import { youTubeVideoId } from "@shared/lib/youtube";
import type { DownloadPhase, DownloaderInput } from "@shared/schemas/downloader";

const PHASE_LABELS: Record<DownloadPhase, string> = {
  checking: "Consultando el video…",
  downloading: "Descargando…",
  converting: "Preparando el archivo…",
  importing: "Guardando en Iris…",
  completed: "Descarga completada",
  cancelled: "Descarga cancelada",
  failed: "No se pudo descargar",
};
export function DownloaderDialog({ onClose }: { onClose: () => void }) {
  const client = useQueryClient();
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<"mp4" | "mp3">("mp4");
  const [quality, setQuality] = useState<"360" | "720">("720");
  const [audioRole, setAudioRole] = useState<"track" | "sound">("track");
  const status = useQuery({
    queryKey: ["downloader"],
    queryFn: () => invoke("downloader:status", undefined),
    refetchInterval: 500,
  });
  const operation = useMutation({
    mutationFn: async (
      action: "help" | "enable" | "disable" | "install" | "configure" | "cancel" | "download",
    ) => {
      if (action === "help") await invoke("downloader:help", undefined);
      else if (action === "enable" || action === "disable")
        await invoke("downloader:enable", action === "enable");
      else if (action === "install") await invoke("downloader:install", undefined);
      else if (action === "configure") await invoke("downloader:configure", undefined);
      else if (action === "cancel") await invoke("downloader:cancel", undefined);
      else
        await invoke("downloader:start", {
          url,
          format,
          quality,
          audioRole,
        } satisfies DownloaderInput);
    },
    meta: { handlesErrors: true },
    onSuccess: () => client.invalidateQueries({ queryKey: ["downloader"] }),
  });
  const current = status.data;
  const job = current?.job;
  const isWorking = Boolean(
    current?.isInstalling ||
    (job && ["checking", "downloading", "converting", "importing"].includes(job.phase)),
  );
  const canDownload = Boolean(
    current?.isEnabled && current.version && current.hasFfmpeg && !isWorking && youTubeVideoId(url),
  );
  return (
    <Dialog
      open
      onClose={onClose}
      title="Descargas personales"
      size="md"
      description="Guarda un video de YouTube como MP4 o solo su audio como MP3 en las carpetas de Iris."
    >
      <div className="flex flex-col gap-4 pb-5">
        {status.isPending ? (
          <Spinner />
        ) : status.isError ? (
          <Banner tone="error">{errorMessage(status.error)}</Banner>
        ) : !current?.isEnabled ? (
          <>
            <p className="text-sm text-ink-2">
              Esta herramienta opcional está desactivada. Actívala para preparar las descargas de tu
              instalación personal.
            </p>
            <Button onClick={() => operation.mutate("enable")} isLoading={operation.isPending}>
              Activar descargas personales
            </Button>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-3 rounded-md bg-surface p-3">
              <p className="text-sm text-ink-2">
                {current.version
                  ? `Herramienta preparada · ${current.version}`
                  : "Primero prepara la herramienta de descarga."}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isWorking}
                  onClick={() => operation.mutate("install")}
                  isLoading={current.isInstalling}
                >
                  {current.version ? "Actualizar herramienta" : "Preparar herramienta"}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isWorking}
                  onClick={() => operation.mutate("configure")}
                >
                  {current.hasFfmpeg ? "Cambiar FFmpeg" : "Seleccionar FFmpeg"}
                </Button>
              </div>
              {!isWorking && (
                <Button variant="ghost" size="sm" onClick={() => operation.mutate("disable")}>
                  Desactivar descargas personales
                </Button>
              )}
              {!current.hasFfmpeg && (
                <Button variant="ghost" size="sm" onClick={() => operation.mutate("help")}>
                  Obtener FFmpeg
                </Button>
              )}
              {!current.hasFfmpeg && (
                <p className="text-xs text-ink-2">
                  FFmpeg permite convertir el audio y unir el video. Obtén una compilación estática
                  para tu sistema desde ffmpeg.org y selecciona la carpeta que contiene ffmpeg y
                  ffprobe. Solo se configura una vez.
                </p>
              )}
            </div>
            <form
              className="flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (canDownload) operation.mutate("download");
              }}
            >
              <TextField
                id="download-url"
                label="Enlace de YouTube"
                placeholder="https://www.youtube.com/watch?v=…"
                value={url}
                disabled={isWorking}
                onChange={(event) => setUrl(event.target.value)}
                error={
                  url.trim() && !youTubeVideoId(url)
                    ? "Escribe el enlace de un video de YouTube."
                    : undefined
                }
              />
              <SegmentedControl
                label="Formato de descarga"
                value={format}
                onChange={setFormat}
                options={[
                  { value: "mp4", label: "Video (MP4)" },
                  { value: "mp3", label: "Solo audio (MP3)" },
                ]}
              />
              {format === "mp4" ? (
                <NativeSelect
                  id="download-quality"
                  label="Calidad"
                  value={quality}
                  disabled={isWorking}
                  onChange={(event) => setQuality(event.target.value as "360" | "720")}
                >
                  <option value="360">360p · Más liviano</option>
                  <option value="720">720p</option>
                </NativeSelect>
              ) : (
                <NativeSelect
                  id="download-role"
                  label="Guardar como"
                  value={audioRole}
                  disabled={isWorking}
                  onChange={(event) => setAudioRole(event.target.value as "track" | "sound")}
                >
                  <option value="track">Pista de canción · Audio</option>
                  <option value="sound">Sonido</option>
                </NativeSelect>
              )}
              <p className="text-xs text-ink-2">
                Un video por vez, hasta 30 minutos y 200 MB. No se admiten emisiones en vivo ni
                videos que requieren iniciar sesión. Necesita internet durante la descarga.
              </p>
              <Button type="submit" disabled={!canDownload || operation.isPending}>
                Descargar
              </Button>
            </form>
          </>
        )}
        {operation.isError && <Banner tone="error">{errorMessage(operation.error)}</Banner>}
        {current?.updateError && !operation.isError && (
          <Banner tone="error">{current.updateError}</Banner>
        )}
        {job && (
          <div className="flex flex-col gap-2" role="status" aria-label="Estado de descarga">
            <p className="truncate text-sm font-medium">{job.title}</p>
            <p className="text-sm text-ink-2">{PHASE_LABELS[job.phase]}</p>
            <progress
              aria-label="Progreso de descarga"
              value={job.progress}
              max={100}
              className="h-2 w-full accent-coral"
            />
            {job.message && (
              <Banner tone={job.phase === "failed" ? "error" : "info"}>{job.message}</Banner>
            )}
          </div>
        )}
        {isWorking && job?.phase !== "importing" && (
          <Button variant="secondary" onClick={() => operation.mutate("cancel")}>
            Cancelar operación
          </Button>
        )}
      </div>
    </Dialog>
  );
}
