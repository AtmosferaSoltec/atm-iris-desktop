import { CircleAlert, CircleCheck } from "lucide-react";
import { Toaster as Sonner } from "sonner";

export { toast } from "sonner";

/** Short notices after saving ("Canción guardada"), in Iris' floating-panel look. */
export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      duration={3500}
      containerAriaLabel="Avisos"
      icons={{
        success: <CircleCheck className="size-4 text-success" />,
        error: <CircleAlert className="size-4 text-danger" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-center gap-3 rounded-md bg-elevated px-4 py-3 text-sm text-ink shadow-menu ring-1 ring-line sm:w-[356px]",
          title: "font-medium",
          description: "text-ink-2",
          icon: "shrink-0",
        },
      }}
    />
  );
}
