import { ProjectionDisplay } from "./features/projection/display";
import { LiveConsolePage } from "./features/console/components/live-console";
import { ChurchSettingsPage } from "./features/church/church-settings";
import { createHashRouter } from "react-router";
import { AppLayout } from "./components/app-layout";
import { PageHeader } from "./components/ui/page-header";
import { BackLink } from "./components/ui/back-link";
import { TimesPage } from "./features/times/times-page";

export const router = createHashRouter([
  { path: "/", element: <LiveConsolePage /> },
  {
    element: <AppLayout />,
    children: [
      { path: "/times", element: <TimesPage /> },
      { path: "/settings", element: <ChurchSettingsPage /> },
    ],
  },
  {
    path: "/display",
    element: <ProjectionDisplay />,
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
