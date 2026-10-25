import { Pause, Play, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Button, IconButton } from "@renderer/components/ui/button";
import { TextField } from "@renderer/components/ui/text-field";
import { timerRemaining } from "@renderer/features/projection/model";
import { clock } from "@shared/lib/format";
import type { LiveConsole } from "../use-live-console";

const PRESETS = [
  { label: "30 s", seconds: 30 },
  { label: "1 min", seconds: 60 },
  { label: "2 min", seconds: 120 },
  { label: "5 min", seconds: 300 },
  { label: "10 min", seconds: 600 },
];

const MAX_SECONDS = 99 * 60 + 59;

/** "Temporizador": a countdown on the screens (30 s, 5 min…), over whatever was showing. */
export function TimerPanel({ ctrl }: { ctrl: LiveConsole }) {
  const { timer } = ctrl;
  const [label, setLabel] = useState("");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!timer?.running) return;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [timer?.running]);

  const left = timer ? Math.ceil(timerRemaining(timer, Math.max(now, timer.at))) : 0;
  const isDone = timer !== null && left === 0;

  function submit(event: FormEvent) {
    event.preventDefault();
    const total = (Number(minutes) || 0) * 60 + (Number(seconds) || 0);
    if (total > 0) ctrl.startTimer(Math.min(total, MAX_SECONDS), label);
  }

  return (
    <div>
      {timer && (
        <div className="mb-4 flex items-center gap-3 rounded-md bg-surface p-3">
          <span className="font-mono text-2xl font-semibold tabular-nums">{clock(left)}</span>
          <div className="ml-auto flex items-center gap-2">
            {!isDone && (
              <IconButton
                label={timer.running ? "Pausar" : "Seguir"}
                onClick={timer.running ? ctrl.pauseTimer : ctrl.resumeTimer}
              >
                {timer.running ? <Pause /> : <Play />}
              </IconButton>
            )}
            <IconButton label="Quitar de la pantalla" onClick={ctrl.hideTimer}>
              <X />
            </IconButton>
          </div>
        </div>
      )}

      <TextField
        id="timer-label"
        label="Texto (opcional)"
        placeholder="Empezamos en…"
        maxLength={60}
        value={label}
        onChange={(event) => setLabel(event.target.value)}
        containerClassName="mb-4"
      />

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <Button
            key={preset.seconds}
            size="sm"
            variant="secondary"
            onClick={() => ctrl.startTimer(preset.seconds, label)}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-4 flex items-end gap-2">
        <TextField
          id="timer-minutes"
          label="Min"
          type="number"
          inputMode="numeric"
          min={0}
          max={99}
          placeholder="0"
          value={minutes}
          onChange={(event) => setMinutes(event.target.value)}
          containerClassName="w-20"
        />
        <TextField
          id="timer-seconds"
          label="Seg"
          type="number"
          inputMode="numeric"
          min={0}
          max={59}
          placeholder="0"
          value={seconds}
          onChange={(event) => setSeconds(event.target.value)}
          containerClassName="w-20"
        />
        <Button type="submit" disabled={!(Number(minutes) > 0 || Number(seconds) > 0)}>
          Iniciar
        </Button>
      </form>
    </div>
  );
}
