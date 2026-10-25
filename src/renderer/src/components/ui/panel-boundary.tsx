import { RotateCw, TriangleAlert } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "./button";

type Props = {
  /** What the panel is, for the message ("la biblioteca"). */
  name: string;
  children: ReactNode;
  className?: string;
};

type State = { error: Error | null };

/**
 * Keeps a failure inside one panel: the rest of the screen keeps working (the projection
 * never stops because the library broke), and "Reintentar" draws the panel again.
 */
export class PanelBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${this.props.name}]`, error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        role="alert"
        className={
          this.props.className ??
          "flex min-h-0 flex-col items-center justify-center gap-3 rounded-xl surface-panel p-6 text-center"
        }
      >
        <TriangleAlert aria-hidden className="size-6 text-warning" />
        <p className="text-sm text-ink-2">
          Algo falló en {this.props.name}. Lo demás sigue funcionando.
        </p>
        <Button
          variant="secondary"
          size="sm"
          icon={<RotateCw className="size-4" />}
          onClick={() => this.setState({ error: null })}
        >
          Reintentar
        </Button>
      </div>
    );
  }
}
