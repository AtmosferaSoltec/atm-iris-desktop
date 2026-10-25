import { FolderOpen, RefreshCw } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IconButton } from "@renderer/components/ui/button";
import { invoke } from "@renderer/lib/ipc";
import { FOLDER_LABELS } from "../messages";

export function LibraryFolderActions({ kind }: { kind: "image" | "video" }) {
  const client = useQueryClient();
  const folder = useMutation({ mutationFn: () => invoke("media:open-folder", kind) });
  const scan = useMutation({
    mutationFn: () => invoke("media:scan", undefined),
    onSuccess: () => client.invalidateQueries({ queryKey: ["console"] }),
  });
  return (
    <>
      <IconButton
        label={FOLDER_LABELS[kind]}
        disabled={folder.isPending}
        onClick={() => folder.mutate()}
      >
        <FolderOpen />
      </IconButton>
      <IconButton
        label="Actualizar biblioteca"
        disabled={scan.isPending}
        aria-busy={scan.isPending || undefined}
        onClick={() => scan.mutate()}
      >
        <RefreshCw className={scan.isPending ? "animate-spin" : undefined} />
      </IconButton>
    </>
  );
}
