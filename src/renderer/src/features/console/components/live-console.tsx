import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Spinner } from "@renderer/components/ui/spinner";
import { Banner } from "@renderer/components/ui/banner";
import { PanelBoundary } from "@renderer/components/ui/panel-boundary";
import { invoke } from "@renderer/lib/ipc";
import type { ConsoleData } from "../model";
import { useLiveConsole } from "../use-live-console";
import { useLibrary } from "../library/use-library";
import { ConsoleDnd } from "../dnd";
import { ConsoleTopBar } from "./console-top-bar";
import { LibraryPanel } from "../library/library-panel";
import { ServicePanel } from "./service-panel";
import { useServiceTimer } from "../use-service-timer";
import { BlockTimerBar } from "./block-timer-bar";
import { Workspace } from "./workspace";

export function LiveConsolePage() {
  const query = useQuery({
    queryKey: ["console"],
    gcTime: 0,
    queryFn: () => invoke("console:load", undefined),
  });
  const client = useQueryClient();
  useEffect(
    () =>
      window.iris.onEvent("media:changed", () => {
        void client.invalidateQueries({ queryKey: ["console"] });
      }),
    [client],
  );
  if (query.isPending)
    return (
      <main className="grid min-h-dvh place-items-center">
        <Spinner />
      </main>
    );
  if (query.isError) return <Banner tone="error">{query.error.message}</Banner>;
  return <LiveConsole data={query.data} />;
}
export function LiveConsole({ data }: { data: ConsoleData }) {
  const ctrl = useLiveConsole(data);
  const service = useServiceTimer(data);
  const library = useLibrary(data.library, ctrl);
  useShortcuts(ctrl);
  return (
    <ConsoleDnd ctrl={ctrl}>
      <div className="fixed inset-0 z-10 flex flex-col bg-canvas" aria-label="Servicio en vivo">
        <PanelBoundary name="la barra superior" className="flex h-[68px] items-center gap-3 px-6">
          <ConsoleTopBar
            ctrl={ctrl}
            churchName={data.churchName}
            serviceName={service.serviceType?.name ?? null}
          />
        </PanelBoundary>
        <div className="grid min-h-0 flex-1 grid-cols-[300px_minmax(0,1fr)_340px] gap-4 px-4 pb-4 2xl:grid-cols-[340px_minmax(0,1fr)_380px]">
          <PanelBoundary name="la biblioteca">
            <LibraryPanel ctrl={ctrl} library={library} />
          </PanelBoundary>
          <div className="flex min-h-0 flex-col gap-4">
            <PanelBoundary name="los tiempos">
              <BlockTimerBar service={service} people={data.people} />
            </PanelBoundary>
            <PanelBoundary name="el elemento abierto">
              <Workspace ctrl={ctrl} />
            </PanelBoundary>
          </div>
          <PanelBoundary name="el servicio">
            <ServicePanel ctrl={ctrl} />
          </PanelBoundary>
        </div>
      </div>
    </ConsoleDnd>
  );
}
function useShortcuts(ctrl: ReturnType<typeof useLiveConsole>) {
  const { step, toggleCleared, togglePlay, toggleTrack } = ctrl;
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null;
      if (
        document.querySelector('[role="dialog"]') ||
        target?.closest(
          "input,textarea,select,[contenteditable=true],[aria-roledescription=sortable]",
        ) ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      )
        return;
      if (["ArrowRight", "ArrowDown", "PageDown"].includes(event.key)) {
        event.preventDefault();
        step(1);
      } else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(event.key)) {
        event.preventDefault();
        step(-1);
      } else if (event.key.toLowerCase() === "b") toggleCleared();
      else if (event.key.toLowerCase() === "p") toggleTrack();
      else if (event.key === " ") {
        event.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, toggleCleared, togglePlay, toggleTrack]);
}
