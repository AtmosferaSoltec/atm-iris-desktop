import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, FolderOpen, ListMusic, MonitorPlay, Sparkles } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Outlet } from "react-router";
import { AtmosferaCredit } from "@renderer/components/brand/atmosfera-credit";
import { IrisWordmark } from "@renderer/components/brand/iris-mark";
import { Button } from "@renderer/components/ui/button";
import { Surface } from "@renderer/components/ui/surface";
import { cn } from "@renderer/lib/cn";
import { invoke } from "@renderer/lib/ipc";

const onboardingKey = ["onboarding"] as const;

type Step = { icon: ReactNode; title: string; text: string };

const STEPS: Step[] = [
  {
    icon: <Sparkles />,
    title: "Bienvenido a Iris",
    text: "Proyecta letras, la Biblia, imágenes y videos en la pantalla de tu iglesia y lleva el tiempo de cada parte del servicio. Todo funciona en esta computadora, sin internet y sin cuenta.",
  },
  {
    icon: <MonitorPlay />,
    title: "Conecta la pantalla",
    text: "Conecta el televisor o el proyector por HDMI y pulsa «Proyectar» en la consola. Tú diriges desde esta pantalla; el templo ve la otra.",
  },
  {
    icon: <ListMusic />,
    title: "Prepara tu servicio",
    text: "Agrega tus canciones o impórtalas desde un archivo JSON, y arrastra lo que vayas a usar al servicio. En Configuración puedes poner el nombre de tu iglesia y la zona horaria.",
  },
  {
    icon: <FolderOpen />,
    title: "Tus archivos son tuyos",
    text: "Los audios, videos e imágenes viven en la carpeta «Iris» de tu computadora y puedes copiarlos cuando quieras. Iris guarda una copia de tus datos antes de cada actualización.",
  },
];

function Tour({ onFinish, isFinishing }: { onFinish: () => void; isFinishing: boolean }) {
  const [index, setIndex] = useState(0);
  const step = STEPS[index]!;
  const isLast = index === STEPS.length - 1;
  return (
    <main
      className="flex min-h-dvh flex-col items-center justify-center gap-8 p-6"
      aria-label="Primeros pasos"
    >
      <IrisWordmark height={32} />
      <Surface className="flex w-full max-w-lg flex-col items-center gap-6 p-8 text-center sm:p-10">
        <span className="flex size-14 items-center justify-center rounded-full bg-surface-raised text-coral ring-1 ring-line ring-inset [&_svg]:size-6">
          {step.icon}
        </span>
        <div className="flex flex-col gap-3">
          <h1 className="font-serif text-3xl font-medium tracking-tight">{step.title}</h1>
          <p className="text-ink-2">{step.text}</p>
        </div>
        <ol className="flex gap-2" aria-label={`Paso ${index + 1} de ${STEPS.length}`}>
          {STEPS.map((candidate, position) => (
            <li
              key={candidate.title}
              className={cn(
                "h-1.5 rounded-full transition-all",
                position === index ? "w-6 bg-accent" : "w-1.5 bg-line-strong",
              )}
            />
          ))}
        </ol>
        <div className="flex w-full items-center justify-between gap-3">
          {index > 0 ? (
            <Button variant="ghost" icon={<ArrowLeft />} onClick={() => setIndex(index - 1)}>
              Atrás
            </Button>
          ) : (
            <Button variant="ghost" onClick={onFinish} disabled={isFinishing}>
              Omitir
            </Button>
          )}
          {isLast ? (
            <Button size="lg" onClick={onFinish} isLoading={isFinishing}>
              Empezar
            </Button>
          ) : (
            <Button size="lg" onClick={() => setIndex(index + 1)}>
              Siguiente
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          )}
        </div>
      </Surface>
      <AtmosferaCredit />
    </main>
  );
}

/** Shows the welcome tour once; afterwards the routes below render as usual. */
export function OnboardingGate() {
  const client = useQueryClient();
  const status = useQuery({
    queryKey: onboardingKey,
    queryFn: () => invoke("onboarding:get", undefined),
  });
  const finish = useMutation({
    mutationFn: () => invoke("onboarding:complete", undefined),
    onSuccess: () => client.setQueryData(onboardingKey, true),
  });
  if (status.isPending) return null;
  if (status.data === false) {
    return <Tour onFinish={() => finish.mutate()} isFinishing={finish.isPending} />;
  }
  return <Outlet />;
}
