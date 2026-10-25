import { Check, Search, UserPlus } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@renderer/components/ui/button";
import { Dialog } from "@renderer/components/ui/dialog";
import { TextField } from "@renderer/components/ui/text-field";
import type { Person } from "@shared/domain/models";
import { findOrAddPerson } from "@renderer/features/people/actions";
import { cn } from "@renderer/lib/cn";
import { nameKey } from "@shared/lib/text";
import type { Leader } from "../use-service-timer";

/**
 * "¿Quién dirige…?": every block has someone in charge. Typing filters the people; someone
 * new is added right here, without leaving the service.
 */
export function LeaderDialog({
  blockName,
  people,
  initialId,
  onClose,
  onConfirm,
  onPersonAdded,
}: {
  blockName: string;
  people: Person[];
  initialId: string | null;
  onClose: () => void;
  onConfirm: (leader: Leader) => void;
  onPersonAdded: (person: Person) => void;
}) {
  const [selected, setSelected] = useState<string | null>(initialId);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string>();
  const [isAdding, startAdd] = useTransition();

  const key = nameKey(query);
  const matches = useMemo(
    () => (key ? people.filter((person) => nameKey(person.name).includes(key)) : people),
    [people, key],
  );
  const exists = people.some((person) => nameKey(person.name) === key);

  const confirm = (person: Person) => onConfirm({ id: person.id, name: person.name });

  function add() {
    setError(undefined);
    startAdd(async () => {
      const result = await findOrAddPerson(query);
      if (!result.person) {
        setError(result.error ?? "No pudimos agregar a esa persona.");
        return;
      }
      onPersonAdded(result.person);
      confirm(result.person);
    });
  }

  const chosen = people.find((person) => person.id === selected);

  return (
    <Dialog
      open
      onClose={onClose}
      title={`¿Quién dirige ${blockName}?`}
      size="sm"
      footer={
        <Button disabled={!chosen} onClick={() => chosen && confirm(chosen)}>
          Guardar
        </Button>
      }
    >
      <div className="flex flex-col gap-3 pb-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (matches.length === 1) confirm(matches[0]);
            else if (query.trim() && !exists) add();
          }}
        >
          <TextField
            id="leader-search"
            aria-label="Buscar o agregar persona"
            placeholder="Busca o escribe un nombre nuevo"
            icon={<Search />}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setError(undefined);
            }}
            error={error}
            autoComplete="off"
            autoFocus
          />
        </form>
        {query.trim() && !exists && (
          <Button
            variant="secondary"
            icon={<UserPlus className="size-4" />}
            isLoading={isAdding}
            onClick={add}
          >
            Agregar «{query.trim()}»
          </Button>
        )}
        <ul className="flex max-h-[45vh] flex-col gap-1 overflow-y-auto" role="radiogroup">
          {matches.map((person) => (
            <li key={person.id}>
              <button
                type="button"
                role="radio"
                aria-checked={selected === person.id}
                onClick={() => setSelected(person.id)}
                onDoubleClick={() => confirm(person)}
                className={cn(
                  "flex w-full cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left text-sm transition",
                  selected === person.id ? "bg-surface-raised font-semibold" : "hover:bg-surface",
                )}
              >
                {person.name}
                {selected === person.id && <Check aria-hidden className="size-4 text-coral" />}
              </button>
            </li>
          ))}
          {people.length === 0 && !query && (
            <li className="px-3 py-2 text-sm text-ink-2">
              Aún no hay personas: escribe el nombre de quien dirige y agrégalo.
            </li>
          )}
        </ul>
      </div>
    </Dialog>
  );
}
