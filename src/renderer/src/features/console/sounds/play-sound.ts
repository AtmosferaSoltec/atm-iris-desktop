const playing = new Map<string, HTMLAudioElement>();
export function forgetSound(id: string): void {
  playing.get(id)?.pause();
  playing.delete(id);
}
export async function playSound(id: string): Promise<boolean> {
  forgetSound(id);
  const audio = new Audio(`iris-media://asset/${id}`);
  playing.set(id, audio);
  audio.onended = () => {
    if (playing.get(id) === audio) playing.delete(id);
  };
  try {
    await audio.play();
    return true;
  } catch {
    forgetSound(id);
    return false;
  }
}
