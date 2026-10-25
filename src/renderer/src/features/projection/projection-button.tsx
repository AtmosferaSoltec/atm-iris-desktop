import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tv } from "lucide-react";
import { Button } from "@renderer/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@renderer/components/ui/popover";
import { toast } from "@renderer/components/ui/toaster";
import { invoke } from "@renderer/lib/ipc";
import { errorMessage } from "@shared/errors";

export function ProjectionButton() {
  const client = useQueryClient();
  const [choice, setChoice] = useState<string | null>(null);
  const preferences = useQuery({
    queryKey: ["projection", "preferences"],
    queryFn: () => invoke("projection:preferences", undefined),
  });
  const selectedChoice =
    choice ??
    (preferences.data?.monitorId !== null && preferences.data?.monitorId !== undefined
      ? String(preferences.data.monitorId)
      : "preview");
  const monitors = useQuery({
    queryKey: ["monitors"],
    queryFn: () => invoke("monitors:list", undefined),
  });
  const status = useQuery({
    queryKey: ["projection", "status"],
    queryFn: () => invoke("projection:get-status", undefined),
  });
  useEffect(() => {
    const stop = window.iris.onEvent("monitors:changed", (list) => {
      client.setQueryData(["monitors"], list);
    });
    const stopStatus = window.iris.onEvent("projection:status", (state) => {
      client.setQueryData(["projection", "status"], state);
      if (state.lostMonitor)
        toast.warning("Se desconectó la pantalla. Revisa el cable HDMI para volver a proyectar.");
    });
    return () => {
      stop();
      stopStatus();
    };
  }, [client]);
  async function toggle(): Promise<void> {
    try {
      if (status.data?.running) await invoke("projection:stop", undefined);
      else
        await invoke(
          "projection:start",
          selectedChoice === "preview"
            ? { isPreview: true }
            : { isPreview: false, monitorId: Number(selectedChoice) },
        );
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        void toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="secondary" icon={<Tv className="size-4" />}>
          {status.data?.running ? "Proyectando" : "Proyectar"}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <h3 className="mb-3 eyebrow text-ink-2">Proyección</h3>
        <fieldset className="flex flex-col gap-3 text-sm">
          <legend className="sr-only">Pantalla de proyección</legend>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="monitor"
              value="preview"
              checked={selectedChoice === "preview"}
              onChange={() => setChoice("preview")}
            />
            Ventana de vista previa
          </label>
          {monitors.data?.map((monitor) => (
            <label key={monitor.id} className="flex cursor-pointer items-start gap-2">
              <input
                type="radio"
                name="monitor"
                value={monitor.id}
                checked={selectedChoice === String(monitor.id)}
                onChange={() => setChoice(String(monitor.id))}
              />
              <span>
                {monitor.label}
                <span className="block text-xs text-ink-2">
                  {monitor.bounds.width} × {monitor.bounds.height}
                  {monitor.isPrimary ? " · Principal" : ""}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
        <Button className="mt-4 w-full" onClick={() => void toggle()}>
          {status.data?.running ? "Detener proyección" : "Iniciar proyección"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
