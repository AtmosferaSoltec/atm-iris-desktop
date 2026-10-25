import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { errorMessage } from "@shared/errors";
import { toast } from "@renderer/components/ui/toaster";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: (error) => toast.error(errorMessage(error)) }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _result, mutation) => {
      if (!mutation.meta?.handlesErrors) toast.error(errorMessage(error));
    },
  }),
  defaultOptions: { queries: { staleTime: 30_000, retry: false, refetchOnWindowFocus: false } },
});
