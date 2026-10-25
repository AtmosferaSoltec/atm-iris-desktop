import { app, Menu } from "electron";
export function installMenu(): void {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      ...(process.platform === "darwin"
        ? [{ label: "Iris", submenu: [{ label: "Salir de Iris", role: "quit" as const }] }]
        : []),
      {
        label: "Archivo",
        submenu: [
          { label: "Cerrar ventana", role: "close" },
          { label: "Salir de Iris", click: () => app.quit() },
        ],
      },
      {
        label: "Editar",
        submenu: [
          { label: "Deshacer", role: "undo" },
          { label: "Rehacer", role: "redo" },
          { type: "separator" },
          { label: "Cortar", role: "cut" },
          { label: "Copiar", role: "copy" },
          { label: "Pegar", role: "paste" },
          { label: "Seleccionar todo", role: "selectAll" },
        ],
      },
      { label: "Ver", submenu: [{ label: "Pantalla completa", role: "togglefullscreen" }] },
    ]),
  );
}
