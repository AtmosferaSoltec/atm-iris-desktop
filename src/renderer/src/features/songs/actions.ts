import { errorMessage } from "@shared/errors";
import { youTubeVideoId, type YouTubeVideo } from "@shared/lib/youtube";
import { invoke } from "@renderer/lib/ipc";
import { toast } from "@renderer/components/ui/toaster";

export async function findYouTubeTrack(
  link: string,
): Promise<{ video?: YouTubeVideo; error?: string }> {
  const id = youTubeVideoId(link);
  if (!id) return { error: "Ese enlace no es de YouTube." };
  try {
    const result = await invoke("youtube:check", id);
    if (result.isOffline) {
      toast.warning(result.error);
      return { video: { videoId: id, title: "Video de YouTube", author: "" } };
    }
    return result;
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function findLyrics(
  title: string,
  artist: string,
): Promise<{ results?: import("@shared/domain/lyrics").FoundLyrics[]; error?: string }> {
  try {
    return await invoke("songs:lookup-lyrics", { title, artist });
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
