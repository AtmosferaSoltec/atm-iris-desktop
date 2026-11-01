import { FolderOpen, RefreshCw } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@renderer/components/ui/button";
import { toast } from "@renderer/components/ui/toaster";
import { errorMessage } from "@shared/errors";
import { invoke } from "@renderer/lib/ipc";

/** Opens Iris/Audio so the operator can drop MP3 files in, then rescans to pick them up. */
export function AudioFolderActions() {
  const client = useQueryClient();
  const open = useMutation({
    mutationFn: () => invoke("media:open-folder", "audio"),
    onError: (error) => toast.error(errorMessage(error)),
  });
  const scan = useMutation({
    mutationFn: () => invoke("media:scan", undefined),
    onSuccess: () => client.invalidateQueries(),
    onError: (error) => toast.error(errorMessage(error)),
  });
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        size="sm"
        icon={<FolderOpen className="size-4" />}
        isLoading={open.isPending}
        onClick={() => open.mutate()}
      >
        Abrir carpeta de audios
      </Button>
      <Button
        variant="ghost"
        size="sm"
        icon={<RefreshCw className="size-4" />}
        isLoading={scan.isPending}
        onClick={() => scan.mutate()}
      >
        Buscar archivos nuevos
      </Button>
    </div>
  );
}
