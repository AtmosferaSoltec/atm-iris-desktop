import { invoke } from "@renderer/lib/ipc";
import { queryClient } from "@renderer/lib/query-client";
import { errorMessage } from "@shared/errors";
import type { z } from "@shared/zod";
import type { eraseSchema, EraseResult } from "@shared/schemas/backup";
import type { SongImportPreview, SongImportResult } from "@shared/schemas/song-import";
import type { AudioMatchPreview, AudioMatchResult } from "@shared/schemas/audio-match";

export async function exportBackup(): Promise<{ error?: string }> {
  try {
    await invoke("backup:export", undefined);
    return {};
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
export async function eraseContent(
  input: Omit<z.infer<typeof eraseSchema>, "confirm"> & { confirm: string },
): Promise<{ result?: EraseResult; error?: string }> {
  try {
    const result = await invoke("backup:erase", input as z.infer<typeof eraseSchema>);
    await queryClient.invalidateQueries();
    return { result };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function previewSongImport(): Promise<{
  preview?: SongImportPreview;
  error?: string;
}> {
  try {
    const preview = await invoke("songs:import-preview", undefined);
    return preview ? { preview } : {};
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
export async function confirmSongImport(
  token: string,
): Promise<{ result?: SongImportResult; error?: string }> {
  try {
    const result = await invoke("songs:import-confirm", { token });
    await queryClient.invalidateQueries();
    return { result };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function previewAudioMatch(): Promise<{
  preview?: AudioMatchPreview;
  error?: string;
}> {
  try {
    return { preview: await invoke("songs:match-audio-preview", undefined) };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
export async function confirmAudioMatch(
  token: string,
  songIds: string[],
): Promise<{ result?: AudioMatchResult; error?: string }> {
  try {
    const result = await invoke("songs:match-audio-confirm", { token, songIds });
    await queryClient.invalidateQueries();
    return { result };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
