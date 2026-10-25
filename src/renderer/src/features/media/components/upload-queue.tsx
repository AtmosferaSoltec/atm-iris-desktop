import { CircleAlert, CircleCheck, RotateCw, X } from "lucide-react";
import { Button, IconButton } from "@renderer/components/ui/button";
import { Spinner } from "@renderer/components/ui/spinner";
import { Surface } from "@renderer/components/ui/surface";
import { fileSize } from "@shared/lib/format";
import { KIND_COLORS, KIND_ICONS } from "../media-format";
import type { UploadItem } from "../upload/use-media-upload";

import { IMPORT_STATUS_TEXT } from "../messages";

type Props = {
  items: UploadItem[];
  onRetry: (id: string) => void;
  onDismiss: (id: string) => void;
  onClearFinished: () => void;
};

export function UploadQueue({ items, onRetry, onDismiss, onClearFinished }: Props) {
  if (items.length === 0) return null;
  const hasFinished = items.some((item) => item.status === "done" || item.status === "error");

  return (
    <Surface role="region" aria-label="Importaciones" className="flex flex-col gap-1 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 pb-2">
        <h2 className="eyebrow text-ink-2">Importaciones</h2>
        {hasFinished && (
          <Button variant="ghost" size="sm" onClick={onClearFinished}>
            Limpiar terminadas
          </Button>
        )}
      </div>
      <ul className="flex flex-col divide-y divide-line">
        {items.map((item) => {
          const Icon = item.kind ? KIND_ICONS[item.kind] : CircleAlert;
          const color = item.kind ? KIND_COLORS[item.kind] : "var(--color-ink-3)";
          const isActive = item.status !== "done" && item.status !== "error";
          return (
            <li key={item.id} className="flex items-center gap-3 py-3">
              <span
                className="grid size-9 shrink-0 place-items-center rounded-sm"
                style={{ color, backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)` }}
              >
                <Icon aria-hidden className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline gap-2">
                  <span className="truncate text-sm font-semibold">{item.title}</span>
                  <span className="shrink-0 text-xs text-ink-2">{fileSize(item.sizeBytes)}</span>
                </p>
                {item.status === "error" ? (
                  <p role="alert" className="text-xs font-medium text-danger">
                    {item.error}
                    {item.canRetry && " Reintenta."}
                  </p>
                ) : (
                  <p className="flex items-center gap-1.5 text-xs text-ink-2">
                    {item.status === "done" ? (
                      <CircleCheck aria-hidden className="size-3.5 text-success" />
                    ) : (
                      <Spinner className="size-3.5" />
                    )}
                    {IMPORT_STATUS_TEXT[item.status]}
                  </p>
                )}
              </div>
              {item.status === "error" && item.canRetry && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<RotateCw className="size-3.5" />}
                  onClick={() => onRetry(item.id)}
                >
                  Reintentar
                </Button>
              )}
              {!isActive && (
                <IconButton
                  label={`Quitar ${item.title} de la lista`}
                  onClick={() => onDismiss(item.id)}
                >
                  <X />
                </IconButton>
              )}
            </li>
          );
        })}
      </ul>
    </Surface>
  );
}
