import { ProjectionDisplay } from "./features/projection/display";
import { LiveConsolePage } from "./features/console/components/live-console";
import { ChurchSettingsPage } from "./features/church/church-settings";
import { createHashRouter } from "react-router";
import { AppLayout, SettingsWindowLayout } from "./components/app-layout";
import { PageHeader } from "./components/ui/page-header";
import { BackLink } from "./components/ui/back-link";
import { OnboardingGate } from "./features/onboarding/onboarding-gate";
import { TimesPage } from "./features/times/times-page";

export const router = createHashRouter([
  {
    // The projection window (/display) stays outside the gate: it must never show the tour.
    element: <OnboardingGate />,
    children: [
      { path: "/", element: <LiveConsolePage /> },
      {
        element: <AppLayout />,
        children: [{ path: "/times", element: <TimesPage /> }],
      },
    ],
  },
  {
    path: "/display",
    element: <ProjectionDisplay />,
  },
  // Its own window (main opens it from the console's gear): no tour, no "back to the service".
  {
    path: "/settings",
    element: (
      <SettingsWindowLayout>
        <ChurchSettingsPage />
      </SettingsWindowLayout>
    ),
  },
  ...(import.meta.env.DEV
    ? [
        {
          path: "/_design",
          lazy: async () => ({
            Component: (await import("./features/design/design-gallery")).DesignGallery,
          }),
        },
      ]
    : []),
  {
    path: "*",
    element: (
      <main className="flex flex-col gap-6 p-8">
        <PageHeader title="Página no encontrada" />
        <BackLink href="/">Volver al servicio</BackLink>
      </main>
    ),
  },
]);
