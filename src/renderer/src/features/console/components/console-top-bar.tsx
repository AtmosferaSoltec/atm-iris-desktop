import { BibleButton } from "../bible/bible-button";
import { ProjectionButton } from "@renderer/features/projection/projection-button";
import { BackgroundPicker } from "../backgrounds/background-picker";
import { IrisWordmark } from "@renderer/components/brand/iris-mark";
import { ToolsButton } from "../tools/tools-button";
import { ButtonLink } from "@renderer/components/ui/button";
import type { LiveConsole } from "../use-live-console";

export function ConsoleTopBar({
  ctrl,
  churchName,
  serviceName,
}: {
  ctrl: LiveConsole;
  churchName: string;
  serviceName: string | null;
}) {
  return (
    <header className="flex h-[68px] shrink-0 items-center gap-4 px-6">
      <IrisWordmark height={24} />
      <span aria-hidden className="h-7 w-px bg-line" />
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold">{serviceName ?? "Servicio"}</p>
        <p className="truncate text-xs text-ink-2">{churchName}</p>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <ButtonLink href="/times" variant="ghost">
          Tiempos
        </ButtonLink>
        <ButtonLink href="/settings" variant="ghost">
          Configuración
        </ButtonLink>
        <BibleButton ctrl={ctrl} />
        <ToolsButton ctrl={ctrl} />
        <BackgroundPicker ctrl={ctrl} />
        <ProjectionButton />
      </div>
    </header>
  );
}
