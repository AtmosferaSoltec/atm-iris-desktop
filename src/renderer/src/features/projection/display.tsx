import { useEffect, useState } from "react";
import { BLACK_FRAME, type ProjectionFrame } from "@shared/domain/projection";
import { ProjectionCanvas } from "@renderer/components/projection/projection-canvas";
import { invoke } from "@renderer/lib/ipc";

export function ProjectionDisplay() {
  const [frame, setFrame] = useState<ProjectionFrame>(BLACK_FRAME);
  useEffect(() => {
    const stop = window.iris.onEvent("projection:frame", setFrame);
    void invoke("projection:request-frame", undefined).then(setFrame);
    return stop;
  }, []);
  return (
    <main
      aria-label="Proyección"
      className="fixed inset-0 grid cursor-none place-items-center overflow-hidden bg-black"
    >
      <ProjectionCanvas
        frame={frame}
        transitions
        playsVideo
        audible
        onVideoError={(message) => void invoke("projection:report-error", message)}
        onVideoTime={(time) => void invoke("projection:video-time", time)}
        className="max-h-dvh w-full max-w-[calc(100dvh*16/9)]"
      />
    </main>
  );
}
