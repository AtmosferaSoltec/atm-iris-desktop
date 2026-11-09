import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlay, Type } from "lucide-react";
import { useMemo, useState } from "react";
import { ProjectionCanvas } from "@renderer/components/projection/projection-canvas";
import { Button } from "@renderer/components/ui/button";
import { Dialog } from "@renderer/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@renderer/components/ui/popover";
import { toast } from "@renderer/components/ui/toaster";
import {
  DEFAULT_TYPOGRAPHY,
  type ProjectionFrame,
  type ProjectionTypography,
} from "@renderer/features/projection/model";
import { invoke } from "@renderer/lib/ipc";
import type { BibleAppearance } from "@shared/domain/models";
import { BackgroundSwatch } from "../backgrounds/background-swatch";
import { TypographyFields } from "../typography/typography-fields";

const SAMPLE = {
  text: "Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito, para que todo aquel que en él cree, no se pierda, mas tenga vida eterna.",
  footnote: "Juan 3:16 · RVR1960",
};
const APPEARANCE_KEY = ["bible", "appearance"] as const;

/** What the Bible window offers to change: the Bible's own background and lettering. */
export function BibleLook() {
  const client = useQueryClient();
  const appearance = useQuery({
    queryKey: APPEARANCE_KEY,
    queryFn: () => invoke("bible:get-appearance", undefined),
  });
  const backgrounds = useQuery({
    queryKey: ["bible", "backgrounds"],
    queryFn: () => invoke("projection:backgrounds", undefined),
  });
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => invoke("settings:get", undefined),
  });
  const save = useMutation({
    // The font key is validated against the list in main; here it is a plain string.
    mutationFn: (next: BibleAppearance) =>
      invoke(
        "bible:set-appearance",
        next as Parameters<(typeof window.iris)["bible:set-appearance"]>[0],
      ),
    onSuccess: (saved) => client.setQueryData(APPEARANCE_KEY, saved),
    onError: (error) => toast.error(error.message),
  });
  const [isTextOpen, setIsTextOpen] = useState(false);
  if (!appearance.data) return null;
  const current = appearance.data;
  const songTypography: ProjectionTypography = settings.data?.projection ?? DEFAULT_TYPOGRAPHY;
  const background =
    backgrounds.data?.find((candidate) => candidate.id === current.backgroundId) ?? null;

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            title="Fondo de los versículos"
            className="flex h-9 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-medium text-ink ring-1 ring-line transition ring-inset hover:bg-surface data-[state=open]:bg-surface"
          >
            <ImagePlay aria-hidden className="size-4 text-rose" />
            Fondo
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[420px]">
          <h3 className="mb-1 eyebrow text-ink-2">Fondo de la Biblia</h3>
          <p className="mb-3 text-xs text-ink-2">
            Cada versículo sale con este fondo. Si no eliges uno, usa el que esté en la consola.
          </p>
          <div className="grid max-h-[60vh] grid-cols-3 gap-3 overflow-y-auto p-0.5">
            <BackgroundSwatch
              name="El de la consola"
              isSelected={current.backgroundId === null}
              onSelect={() => save.mutate({ ...current, backgroundId: null })}
            />
            {backgrounds.data?.map((entry) => (
              <BackgroundSwatch
                key={entry.id}
                name={entry.name}
                background={entry}
                isSelected={current.backgroundId === entry.id}
                onSelect={() => save.mutate({ ...current, backgroundId: entry.id })}
              />
            ))}
          </div>
          {backgrounds.data?.length === 0 && (
            <p className="mt-3 text-xs text-ink-2">
              Aún no hay fondos. Agrégalos desde «Fondo» en la consola.
            </p>
          )}
        </PopoverContent>
      </Popover>
      <button
        type="button"
        onClick={() => setIsTextOpen(true)}
        title="Letra de los versículos"
        className="flex h-9 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-medium text-ink ring-1 ring-line transition ring-inset hover:bg-surface"
      >
        <Type aria-hidden className="size-4 text-violet" />
        Texto
      </button>
      {isTextOpen && (
        <BibleTextDialog
          initial={current.typography ?? songTypography}
          isOwn={current.typography !== null}
          songTypography={songTypography}
          background={background}
          isSaving={save.isPending}
          onSave={(typography) =>
            save.mutate(
              { ...current, typography },
              {
                onSuccess: () => {
                  toast.success("Letra de la Biblia actualizada");
                  setIsTextOpen(false);
                },
              },
            )
          }
          onClose={() => setIsTextOpen(false)}
        />
      )}
    </div>
  );
}

/** The Bible's own typeface, size and style: apart from the songs', so long verses fit. */
function BibleTextDialog({
  initial,
  isOwn,
  songTypography,
  background,
  isSaving,
  onSave,
  onClose,
}: {
  initial: ProjectionTypography;
  isOwn: boolean;
  songTypography: ProjectionTypography;
  background: ProjectionFrame["background"];
  isSaving: boolean;
  onSave: (typography: ProjectionTypography | null) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const preview = useMemo<ProjectionFrame>(
    () => ({
      background,
      content: { kind: "text", ...SAMPLE },
      typography: draft,
    }),
    [background, draft],
  );
  return (
    <Dialog
      open
      onClose={onClose}
      size="xl"
      title="Letra de la Biblia"
      description="Es aparte de la letra de las canciones: cambia aquí solo cómo se ven los versículos."
      footer={
        <>
          {isOwn && (
            <Button
              variant="ghost"
              disabled={isSaving}
              onClick={() => onSave(null)}
              title="Los versículos vuelven a verse con la letra de las canciones"
            >
              Usar la de las canciones
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => onSave(draft)} isLoading={isSaving}>
            Aplicar
          </Button>
        </>
      }
    >
      <div className="grid items-start gap-6 pb-4 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <ProjectionCanvas
          frame={preview}
          className="rounded-md ring-1 ring-line md:sticky md:top-0"
        />
        <div className="flex flex-col gap-6">
          <TypographyFields
            draft={draft}
            onChange={(change) => setDraft((current) => ({ ...current, ...change }))}
            sizeTitle="Tamaño de los versículos"
          />
          {!isOwn && (
            <p className="text-xs text-ink-2">
              Ahora usa la misma letra que las canciones ({songTypography.fontSizePt}).
            </p>
          )}
        </div>
      </div>
    </Dialog>
  );
}
