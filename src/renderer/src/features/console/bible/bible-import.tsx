import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@renderer/components/ui/button";
import { Banner } from "@renderer/components/ui/banner";
import { invoke } from "@renderer/lib/ipc";
import { errorMessage } from "@shared/errors";
import { toast } from "@renderer/components/ui/toaster";

export function BibleImport() {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => invoke("bible:import", undefined),
    meta: { handlesErrors: true },
    onSuccess: async (result) => {
      if (!result) return;
      await client.invalidateQueries({ queryKey: ["bible"] });
      toast.success("Biblia RVR1960 importada");
    },
  });
  return (
    <div className="flex flex-col gap-3">
      {mutation.isError && <Banner tone="error">{errorMessage(mutation.error)}</Banner>}
      <Button variant="secondary" onClick={() => mutation.mutate()} isLoading={mutation.isPending}>
        Importar RVR1960
      </Button>
    </div>
  );
}
