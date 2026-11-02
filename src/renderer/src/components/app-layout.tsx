import type { ReactNode } from "react";
import { Outlet } from "react-router";
import { IrisWordmark } from "./brand/iris-mark";
import { BackLink } from "./ui/back-link";

export function AppLayout() {
  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between gap-4 border-b border-line px-4 py-3 sm:px-8 lg:px-12">
        <BackLink href="/">Volver al servicio</BackLink>
        <IrisWordmark height={24} />
      </header>
      <main className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
        <Outlet />
      </main>
    </div>
  );
}

/** The settings window: closing it is how the operator goes back, so there is no back link. */
export function SettingsWindowLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between gap-4 border-b border-line px-4 py-3 sm:px-8">
        <IrisWordmark height={24} />
        <p className="text-xs text-ink-2">Los cambios se ven en el servicio al volver a él.</p>
      </header>
      <main className="min-w-0 px-4 py-8 sm:px-8">{children}</main>
    </div>
  );
}
