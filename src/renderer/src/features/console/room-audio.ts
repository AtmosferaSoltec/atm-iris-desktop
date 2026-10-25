export type RoomAudioHandlers = {
  /** The real length, once known. */
  onDuration: (seconds: number) => void;
  /** A track that does not repeat reached its end. */
  onEnded: () => void;
  /** A play() that failed for a reason other than being cut short by a pause or another track. */
  onError: () => void;
};

/**
 * The song tracks that play in the room, from this computer (the screens are silent).
 * One `<audio>` for the console, created on first use; React never touches it directly.
 */
export class RoomAudio {
  private element: HTMLAudioElement | null = null;
  private handlers: RoomAudioHandlers = {
    onDuration: () => {},
    onEnded: () => {},
    onError: () => {},
  };

  /** Who hears the real length, the end and the errors; returns the function that stops listening. */
  listen(handlers: RoomAudioHandlers): () => void {
    this.handlers = handlers;
    return () => {
      if (this.handlers === handlers) {
        this.handlers = { onDuration: () => {}, onEnded: () => {}, onError: () => {} };
      }
    };
  }

  private get audio(): HTMLAudioElement {
    if (!this.element) {
      const created = new Audio();
      created.addEventListener("loadedmetadata", () =>
        this.handlers.onDuration(created.duration || 0),
      );
      created.addEventListener("ended", () => {
        if (!created.loop) this.handlers.onEnded();
      });
      this.element = created;
    }
    return this.element;
  }

  /** Loads a track from the start and plays it. */
  start(url: string): void {
    const audio = this.audio;
    audio.loop = false;
    audio.src = url;
    this.resume();
  }

  resume(): void {
    void this.audio.play().catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      this.handlers.onError();
    });
  }

  pause(): void {
    this.element?.pause();
  }

  seek(seconds: number): void {
    if (this.element) this.element.currentTime = seconds;
  }

  setLoop(loop: boolean): void {
    if (this.element) this.element.loop = loop;
  }
}
