import { useState } from "react";
import { Music, Plus } from "lucide-react";
import { PROJECTION_FONTS } from "@shared/domain/projection-fonts";
import { fontStack } from "@shared/domain/projection-font-stack";
import { IrisMark, IrisWordmark } from "@renderer/components/brand/iris-mark";
import { Avatar, AvatarStack } from "@renderer/components/ui/avatar";
import { BackLink } from "@renderer/components/ui/back-link";
import { Banner } from "@renderer/components/ui/banner";
import { Button, ButtonLink, IconButton } from "@renderer/components/ui/button";
import { Chip } from "@renderer/components/ui/chip";
import { Combobox } from "@renderer/components/ui/combobox";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from "@renderer/components/ui/context-menu";
import { Dialog, ConfirmDialog } from "@renderer/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@renderer/components/ui/dropdown-menu";
import { EmptyState } from "@renderer/components/ui/empty-state";
import { Field } from "@renderer/components/ui/field";
import { PageHeader, SectionHeader } from "@renderer/components/ui/page-header";
import { Pagination } from "@renderer/components/ui/pagination";
import { Panel } from "@renderer/components/ui/panel";
import { PanelBoundary } from "@renderer/components/ui/panel-boundary";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverClose,
} from "@renderer/components/ui/popover";
import { SegmentedControl } from "@renderer/components/ui/segmented-control";
import { Select, NativeSelect } from "@renderer/components/ui/select";
import { Skeleton, TileSkeleton } from "@renderer/components/ui/skeleton";
import { Spinner } from "@renderer/components/ui/spinner";
import { SubmitButton } from "@renderer/components/ui/submit-button";
import { Surface } from "@renderer/components/ui/surface";
import { Switch } from "@renderer/components/ui/switch";
import { TextArea } from "@renderer/components/ui/text-area";
import { TextField } from "@renderer/components/ui/text-field";
import { Tile } from "@renderer/components/ui/tile";
import { toast } from "@renderer/components/ui/toaster";
import { Tooltip } from "@renderer/components/ui/tooltip";
import { SlidePreview } from "@renderer/components/projection/slide-preview";
import { BlockTimeline } from "@renderer/components/service/block-timeline";
import { TimeBar } from "@renderer/components/service/time-bar";

export function DesignGallery() {
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isChecked, setIsChecked] = useState(true);
  const [selected, setSelected] = useState("songs");
  const [page, setPage] = useState(1);
  const [person, setPerson] = useState("");
  return (
    <main className="mx-auto flex max-w-content flex-col gap-8 p-8">
      <BackLink href="/">Volver al servicio</BackLink>
      <PageHeader
        title="Diseño de Iris"
        description="Componentes y tipografía sin conexión."
        titleAccessory={<IrisMark />}
        actions={<IrisWordmark />}
      />
      <Panel title="Botones" description="Acciones, navegación y estados.">
        <div className="flex flex-wrap gap-3">
          {(["primary", "secondary", "ghost", "danger"] as const).map((variant) => (
            <Button key={variant} variant={variant}>
              Guardar
            </Button>
          ))}
          <Button size="sm">Agregar</Button>
          <Button size="lg" icon={<Plus />}>
            Agregar
          </Button>
          <Button disabled>Guardar</Button>
          <Button isLoading>Guardando</Button>
          <ButtonLink href="/settings">Configuración</ButtonLink>
          <Tooltip content="Agregar">
            <IconButton label="Agregar">
              <Plus />
            </IconButton>
          </Tooltip>
          <IconButton label="Seleccionado" isActive>
            <Music />
          </IconButton>
          <form onSubmit={(event) => event.preventDefault()}>
            <SubmitButton>Guardar</SubmitButton>
          </form>
        </div>
      </Panel>
      <Panel title="Campos">
        <div className="grid grid-cols-2 gap-6">
          <TextField id="gallery-name" label="Nombre" hint="Nombre y apellido" />
          <TextField id="gallery-error" label="Título" error="Escribe un título." />
          <TextField id="gallery-disabled" label="Desactivado" disabled />
          <TextField id="gallery-search" label="Buscar" density="sm" icon={<Music />} />
          <TextField id="gallery-password" label="Contraseña" type="password" />
          <TextArea id="gallery-lyrics" label="Letra" />
          <Select
            id="gallery-select"
            label="Tipo"
            options={[
              { value: "song", label: "Canción" },
              { value: "media", label: "Multimedia" },
            ]}
            defaultValue="song"
          />
          <Select id="gallery-select-disabled" label="Tipo desactivado" options={[]} disabled />
          <NativeSelect id="gallery-minutes" label="Minutos">
            <option>10</option>
            <option>15</option>
          </NativeSelect>
          <Combobox
            id="gallery-person"
            label="Responsable"
            options={[{ value: "ana", label: "Ana Torres" }]}
            value={person}
            onValueChange={setPerson}
          />
          <Field id="gallery-switch" label="Proyección">
            <Switch
              id="gallery-switch"
              label="Proyección"
              checked={isChecked}
              onCheckedChange={setIsChecked}
            />
          </Field>
          <Switch label="Desactivado" checked={false} onCheckedChange={() => {}} disabled />
        </div>
        <SegmentedControl
          label="Biblioteca"
          options={[
            { value: "songs", label: "Canciones" },
            { value: "media", label: "Multimedia" },
          ]}
          value={selected}
          onChange={setSelected}
        />
      </Panel>
      <Panel title="Avisos y estados">
        <Banner tone="info">Todo listo.</Banner>
        <Banner tone="success">Canción guardada</Banner>
        <Banner tone="error">Algo salió mal. Inténtalo de nuevo.</Banner>
        <div className="flex gap-3">
          <Chip>Sin pantalla</Chip>
          <Chip color="var(--color-success)">En pantalla</Chip>
          <Avatar name="Ana Torres" />
          <AvatarStack
            names={["Ana Torres", "Carlos Pérez", "Daniel Ruiz", "Lucía Gómez"]}
            max={2}
          />
          <Spinner />
        </div>
        <Skeleton className="h-4 w-48" />
        <TileSkeleton />
        <PanelBoundary name="la biblioteca">
          <EmptyState
            icon={<Music />}
            title="Servicio vacío"
            description="Haz clic en Agregar para sumar canciones, imágenes o videos."
            action={<Button>Agregar</Button>}
          />
        </PanelBoundary>
        <Button onClick={() => toast.success("Canción guardada")}>Mostrar aviso</Button>
      </Panel>
      <Panel title="Ventanas y menús">
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setIsOpen(true)}>Abrir diálogo</Button>
          <Button variant="danger" onClick={() => setIsConfirmOpen(true)}>
            Eliminar
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="secondary">Fondos</Button>
            </PopoverTrigger>
            <PopoverContent>
              <p>FONDOS</p>
              <PopoverClose asChild>
                <Button variant="ghost">Cerrar</Button>
              </PopoverClose>
            </PopoverContent>
          </Popover>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary">Opciones</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Servicio</DropdownMenuLabel>
              <DropdownMenuItem>Duplicar</DropdownMenuItem>
              <DropdownMenuItem disabled>Mover arriba</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={selected} onValueChange={setSelected}>
                <DropdownMenuRadioItem value="songs">Canciones</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="media">Multimedia</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Más</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem>Agregar</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem tone="danger">Eliminar</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ContextMenu>
            <ContextMenuTrigger className="rounded-md bg-surface px-4 py-3 text-sm">
              Clic derecho
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem>Duplicar</ContextMenuItem>
              <ContextMenuItem tone="danger">Eliminar</ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </div>
        <Dialog
          open={isOpen}
          onClose={() => setIsOpen(false)}
          title="Editar canción"
          description="Título y letra."
          footer={<Button onClick={() => setIsOpen(false)}>Guardar</Button>}
        >
          <TextField id="dialog-title" label="Título" />
        </Dialog>
        <ConfirmDialog
          open={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={() => setIsConfirmOpen(false)}
          title="¿Vaciar el servicio?"
          description="Esta acción no se puede deshacer."
          confirmLabel="Vaciar servicio"
        />
        <Pagination meta={{ page, limit: 20, total: 54, totalPages: 3 }} onPageChange={setPage} />
      </Panel>
      <Surface className="p-6">
        <SectionHeader>Servicio</SectionHeader>
        <BlockTimeline
          blocks={[
            { id: "1", name: "Bienvenida", plannedMinutes: 10 },
            { id: "2", name: "Alabanzas", plannedMinutes: 15 },
          ]}
        />
        <TimeBar actual={75} planned={60} scale={100} />
      </Surface>
      <Tile
        href="/times"
        icon={<Music />}
        title="Tiempos"
        subtitle="Registros"
        color="var(--color-coral)"
      />
      <SlidePreview text="Sublime gracia del Señor" label="Estrofa 1" />
      <Panel title="Fuentes de proyección">
        {PROJECTION_FONTS.map((font) => (
          <p
            key={font.key}
            data-font-key={font.key}
            style={{ fontFamily: fontStack(font.key) }}
            className="text-2xl"
          >
            {font.label} · Sublime gracia del Señor
          </p>
        ))}
      </Panel>
    </main>
  );
}
