import { BiblesPanel } from "@renderer/features/console/bible/bibles-panel";
import { MaintenancePanels } from "@renderer/features/backup/components/maintenance-panels";
import { Building2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import type { ChurchSettings } from "@shared/domain/models";
import { CHURCH_FIELDS, churchSchema } from "@shared/schemas/settings";
import { toFormErrors } from "@shared/errors";
import { listTimeZones } from "@shared/lib/time-zones";
import { Banner } from "@renderer/components/ui/banner";
import { Button } from "@renderer/components/ui/button";
import { Combobox } from "@renderer/components/ui/combobox";
import { PageHeader } from "@renderer/components/ui/page-header";
import { Panel } from "@renderer/components/ui/panel";
import { Spinner } from "@renderer/components/ui/spinner";
import { TextField } from "@renderer/components/ui/text-field";
import { toast } from "@renderer/components/ui/toaster";
import { invoke } from "@renderer/lib/ipc";

const settingsKeys = { all: ["settings"] as const };
const TIME_ZONE_OPTIONS = listTimeZones().map((zone) => ({
  value: zone.id,
  label: zone.city,
  group: zone.region,
  keywords: zone.id,
}));

function ChurchForm({ church }: { church: ChurchSettings }) {
  const client = useQueryClient();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<z.infer<typeof churchSchema>>({
    resolver: zodResolver(churchSchema),
    defaultValues: { name: church.name, timezone: church.timezone },
  });
  const mutation = useMutation({
    mutationFn: (input: z.infer<typeof churchSchema>) => invoke("settings:update-church", input),
    meta: { handlesErrors: true },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: settingsKeys.all });
      toast.success("Cambios guardados");
    },
    onError: (error) => {
      const mapped = toFormErrors(error, CHURCH_FIELDS);
      for (const field of CHURCH_FIELDS)
        if (mapped.fields[field]) setError(field, { message: mapped.fields[field] });
      if (mapped.message) setError("root", { message: mapped.message });
    },
  });
  return (
    <form
      className="flex flex-col gap-5"
      noValidate
      onSubmit={handleSubmit((input) => mutation.mutate(input))}
    >
      {errors.root?.message && <Banner tone="error">{errors.root.message}</Banner>}
      <TextField
        id="name"
        label="Nombre"
        icon={<Building2 />}
        {...register("name")}
        error={errors.name?.message}
      />
      <Controller
        name="timezone"
        control={control}
        render={({ field }) => (
          <Combobox
            id="timezone"
            name="timezone"
            label="Zona horaria"
            hint="Se usa para el saludo, los horarios de los servicios y los resúmenes de tiempos."
            options={TIME_ZONE_OPTIONS}
            value={field.value}
            onValueChange={field.onChange}
            searchPlaceholder="Buscar ciudad o región"
            emptyText="No encontramos esa zona"
            error={errors.timezone?.message}
          />
        )}
      />
      <div>
        <Button type="submit" isLoading={mutation.isPending}>
          Guardar
        </Button>
      </div>
    </form>
  );
}

export function ChurchSettingsPage() {
  const settings = useQuery({
    queryKey: settingsKeys.all,
    queryFn: () => invoke("settings:get", undefined),
  });
  return (
    <div className="mx-auto flex max-w-settings flex-col gap-8">
      <PageHeader title="Ajustes" />
      {settings.isPending ? (
        <Spinner />
      ) : settings.isError ? (
        <Banner tone="error">{settings.error.message}</Banner>
      ) : (
        <Panel title="Iglesia">
          <ChurchForm church={settings.data.church} />
        </Panel>
      )}
      <BiblesPanel />
      <MaintenancePanels />
    </div>
  );
}
