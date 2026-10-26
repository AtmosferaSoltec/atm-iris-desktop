const NO_HANDLERS: RoomAudioHandlers = {
  onDuration: () => {},
  onEnded: () => {},
  onRestart: () => {},
  onError: () => {},
};

export type RoomAudioHandlers = {
  /** The real length, once known. */
  onDuration: (seconds: number) => void;
  /** A track that does not repeat reached its end. */
  onEnded: () => void;
  /** A repeating track went back to the start by itself. */
  onRestart: () => void;
  /** A play() that failed for a reason other than being cut short by a pause or another track. */
  onError: () => void;
};

/**
 * The song tracks that play in the room, from this computer (the screens are silent).
 * One `<audio>` for the console, created on first use; React never touches it directly.
 */
export class RoomAudio {
  private element: HTMLAudioElement | null = null;
  private volume = 1;
  private isLooping = false;
  private handlers: RoomAudioHandlers = NO_HANDLERS;

  /** Who hears the real length, the end and the errors; returns the function that stops listening. */
  listen(handlers: RoomAudioHandlers): () => void {
    this.handlers = handlers;
    return () => {
      if (this.handlers === handlers) {
        this.handlers = NO_HANDLERS;
      }
    };
  }

  private get audio(): HTMLAudioElement {
    if (!this.element) {
      const created = new Audio();
      created.volume = this.volume;
      created.addEventListener("loadedmetadata", () =>
        this.handlers.onDuration(created.duration || 0),
      );
      // Repeating is done here, not with `audio.loop`: the native loop gives no signal, and the
      // console's progress clock would keep showing the end of the first pass.
      created.addEventListener("ended", () => {
        if (!this.isLooping) return this.handlers.onEnded();
        created.currentTime = 0;
        this.resume();
        this.handlers.onRestart();
      });
      this.element = created;
    }
    return this.element;
  }

  /** Loads a track from the start and plays it. */
  start(url: string): void {
    const audio = this.audio;
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

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume));
    if (this.element) this.element.volume = this.volume;
  }

  setLoop(loop: boolean): void {
    this.isLooping = loop;
  }
}
