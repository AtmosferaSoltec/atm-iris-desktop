import { Plus } from "lucide-react";
import { Button } from "@renderer/components/ui/button";

/** Local media is managed in its folders; only songs and YouTube links have creation actions. */
export type ToolbarTab = "song" | "image" | "video" | "youtube";

/** What can be made from the library: songs, images, videos or YouTube links. */
export function LibraryToolbar({
  tab,
  onNewSong,
  onYouTube,
}: {
  tab: ToolbarTab;
  onNewSong: () => void;
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

  return null;
}
