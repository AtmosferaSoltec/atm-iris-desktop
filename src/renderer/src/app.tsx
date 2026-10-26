import { UpdateGate } from "./features/updates/update-gate";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router";
import { IrisBackground } from "./components/brand/iris-background";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import { queryClient } from "./lib/query-client";
import { router } from "./router";

export default function App(): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <IrisBackground />
        <UpdateGate>
          <RouterProvider router={router} />
        </UpdateGate>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
