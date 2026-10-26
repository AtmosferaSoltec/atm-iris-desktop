import { DownloaderDialog, isDownloaderAvailable } from "virtual:iris-downloader-renderer";
import { TOOL_LABELS } from "../messages";
import { ArrowLeft, Download, Timer, Type, Volume2, Wrench, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { IconButton } from "@renderer/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@renderer/components/ui/popover";
import { SoundsPanel } from "../sounds/sounds-panel";
import { TimerPanel } from "../timer/timer-panel";
import { TypographyDialog } from "../typography/typography-dialog";
import type { LiveConsole } from "../use-live-console";

type Tool = {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Tailwind class for the icon's color. */
  tint: string;
} &
  // Small tools open inside the same popover, with no dimmed screen; big ones (with a preview) get a dialog.
  (
    | { panel: (ctrl: LiveConsole) => ReactNode; dialog?: never }
    | { dialog: (ctrl: LiveConsole, onClose: () => void) => ReactNode; panel?: never }
  );

/** The less frequent tools live here, so the top bar keeps only what is needed at once. Add new ones to this list. */
export const TOOLS: Tool[] = [
  ...(isDownloaderAvailable
    ? [
        {
          id: "downloader",
          label: "Descargar",
          icon: Download,
          tint: "text-ember",
          dialog: (_ctrl: LiveConsole, onClose: () => void) => (
            <DownloaderDialog onClose={onClose} />
          ),
        },
      ]
    : []),
  {
    id: "text",
    label: TOOL_LABELS.text,
    icon: Type,
    tint: "text-indigo",
    dialog: (ctrl, onClose) => <TypographyDialog ctrl={ctrl} onClose={onClose} />,
  },
  {
    id: "timer",
    label: TOOL_LABELS.timer,
    icon: Timer,
    tint: "text-coral",
    panel: (ctrl) => <TimerPanel ctrl={ctrl} />,
  },
  {
    id: "sounds",
    label: TOOL_LABELS.sounds,
    icon: Volume2,
    tint: "text-rose",
    panel: (ctrl) => <SoundsPanel ctrl={ctrl} />,
  },
];

/** "Herramientas": a grid of tool cards; choosing one closes it and opens that tool. */
export function ToolsButton({ ctrl }: { ctrl: LiveConsole }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // The tool shown inside the popover in place of the grid.
  const [panelId, setPanelId] = useState<string | null>(null);
  const [dialogId, setDialogId] = useState<string | null>(null);
  const panelTool = TOOLS.find((tool) => tool.id === panelId);
  const dialogTool = TOOLS.find((tool) => tool.id === dialogId);

  function choose(tool: Tool) {
    if (tool.panel) return setPanelId(tool.id);
    setIsMenuOpen(false);
    setDialogId(tool.id);
  }

  return (
    <>
      <Popover
        open={isMenuOpen}
        onOpenChange={(isOpen) => {
          setIsMenuOpen(isOpen);
          if (!isOpen) setPanelId(null);
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            title="Texto, temporizador, sonidos…"
            className={`flex h-10 cursor-pointer items-center gap-2.5 rounded-full px-4 text-sm font-medium text-ink ring-1 ring-line transition ring-inset hover:bg-surface data-[state=open]:bg-surface ${ctrl.timer ? "bg-coral/10" : ""}`}
          >
            <Wrench aria-hidden className="size-4 text-indigo" />
            Herramientas
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[352px]">
          {panelTool?.panel ? (
            <>
              <div className="mb-3 flex items-center gap-1.5">
                <IconButton label="Volver a las herramientas" onClick={() => setPanelId(null)}>
                  <ArrowLeft />
                </IconButton>
                <h3 className="eyebrow text-ink-2">{panelTool.label}</h3>
              </div>
              {panelTool.panel(ctrl)}
            </>
          ) : (
            <>
              <h3 className="mb-3 eyebrow text-ink-2">Herramientas</h3>
              <div className="grid grid-cols-3 gap-2.5">
                {TOOLS.map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => choose(tool)}
                    className="flex h-[76px] cursor-pointer flex-col items-center justify-center gap-2 rounded-sm bg-surface px-1 text-center text-xs font-medium ring-1 ring-line transition ring-inset hover:bg-surface-raised hover:ring-line-strong active:scale-[0.97]"
                  >
                    <tool.icon aria-hidden className={`size-[18px] ${tool.tint}`} />
                    {tool.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>
      {dialogTool?.dialog?.(ctrl, () => setDialogId(null))}
    </>
  );
}
