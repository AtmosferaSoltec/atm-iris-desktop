import { Plus, Upload, RefreshCw } from "lucide-react";
import { invoke } from "@renderer/lib/ipc";
import { Button, IconButton } from "@renderer/components/ui/button";

/** What the library's second row can make: a song, files of one kind, or a YouTube link. */
export type ToolbarTab = "song" | "image" | "video" | "youtube";

import { UPLOAD_LABELS } from "../messages";

/** What can be made from the library: songs, images, videos or YouTube links. */
export function LibraryToolbar({
  tab,
  onNewSong,
  onUpload,
  onYouTube,
}: {
  tab: ToolbarTab;
  onNewSong: () => void;
  onUpload: (files?: FileList) => void;
  onYouTube: () => void;
}) {
  if (tab === "song") {
    return (
      <Button size="sm" icon={<Plus className="size-4" />} onClick={onNewSong}>
        Nueva canción
      </Button>
    );
  }

  if (tab === "youtube")
    return (
      <Button size="sm" icon={<Plus className="size-4" />} onClick={onYouTube}>
        Agregar enlace
      </Button>
    );

  return (
    <>
      <Button size="sm" icon={<Upload className="size-4" />} onClick={() => onUpload()}>
        {UPLOAD_LABELS[tab]}
      </Button>
      <IconButton label="Buscar archivos" onClick={() => void invoke("media:scan", undefined)}>
        <RefreshCw />
      </IconButton>
    </>
  );
}
