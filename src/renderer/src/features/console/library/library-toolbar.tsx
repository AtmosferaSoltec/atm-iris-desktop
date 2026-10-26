import { Plus } from "lucide-react";
import { Button } from "@renderer/components/ui/button";

export type ToolbarTab = "song" | "image" | "video";

export function LibraryToolbar({ tab, onNewSong }: { tab: ToolbarTab; onNewSong: () => void }) {
  if (tab === "song") {
    return (
      <Button size="sm" icon={<Plus className="size-4" />} onClick={onNewSong}>
        Nueva canción
      </Button>
    );
  }

  return null;
}
