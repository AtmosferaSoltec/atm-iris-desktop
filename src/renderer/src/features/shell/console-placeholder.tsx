import { SongLibraryDialog } from "../songs/song-library-dialog";
import { useState } from "react";
import { IrisWordmark } from "@renderer/components/brand/iris-mark";
import { Button, ButtonLink } from "@renderer/components/ui/button";
import { MediaLibraryDialog } from "../media/media-library-dialog";
import { PAGE_LABELS } from "./messages";

export function ConsolePlaceholder() {
  const [isSongsOpen, setIsSongsOpen] = useState(false);
  const [isMediaOpen, setIsMediaOpen] = useState(false);
  return (
    <main className="flex min-h-dvh flex-col gap-6 p-8">
      <IrisWordmark />
      <h1 className="font-serif text-4xl">{PAGE_LABELS.console}</h1>
      <nav className="flex gap-3">
        <ButtonLink href="/settings" variant="secondary">
          {PAGE_LABELS.settings}
        </ButtonLink>
        <ButtonLink href="/times" variant="secondary">
          {PAGE_LABELS.times}
        </ButtonLink>
        <Button onClick={() => setIsSongsOpen(true)}>Canciones</Button>
        <Button onClick={() => setIsMediaOpen(true)}>Multimedia</Button>
      </nav>
      {isSongsOpen && <SongLibraryDialog onClose={() => setIsSongsOpen(false)} />}
      {isMediaOpen && <MediaLibraryDialog onClose={() => setIsMediaOpen(false)} />}
    </main>
  );
}
