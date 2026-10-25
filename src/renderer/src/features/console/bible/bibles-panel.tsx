import { useQuery } from "@tanstack/react-query";
import { Panel } from "@renderer/components/ui/panel";
import { Banner } from "@renderer/components/ui/banner";
import { Spinner } from "@renderer/components/ui/spinner";
import { invoke } from "@renderer/lib/ipc";
import { BibleImport } from "./bible-import";

export function BiblesPanel() {
  const status = useQuery({
    queryKey: ["bible", "status"],
    queryFn: () => invoke("bible:status", undefined),
  });
  return (
    <Panel
      title="Biblias"
      description="Importa tus Biblias en XML para consultarlas y proyectarlas sin internet. Puedes conservar varias traducciones y elegir una desde el panel de Biblia."
    >
      <div className="flex flex-col gap-4">
        {status.isPending ? (
          <Spinner />
        ) : status.isError ? (
          <Banner tone="error">{status.error.message}</Banner>
        ) : status.data.translations.length ? (
          <ul className="divide-y divide-line">
            {status.data.translations.map((translation) => (
              <li key={translation.code} className="py-2">
                <p className="text-sm font-medium">{translation.name}</p>
                <p className="text-xs text-ink-2">
                  {translation.verseCount.toLocaleString("es")} versículos
                </p>
                {translation.copyright && (
                  <p className="text-xs text-ink-2">{translation.copyright}</p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-2">No hay Biblias importadas.</p>
        )}
        <BibleImport />
        <p className="text-xs text-ink-2">
          Formato compatible: XML con bible, testament, book, chapter y verse, con los 66 libros. El
          nombre de la traducción se lee del archivo. Importar de nuevo la misma traducción
          actualiza su contenido y conserva las demás.
        </p>
      </div>
    </Panel>
  );
}
