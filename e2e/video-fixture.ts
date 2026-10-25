import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Page } from "@playwright/test";

export async function createVideoFixture(
  page: Page,
  directory: string,
  durationMs = 2200,
): Promise<string> {
  const bytes = await page.evaluate(async (durationMs) => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext("2d")!;
    const stream = canvas.captureStream(10);
    const recorder = new MediaRecorder(stream, { mimeType: "video/mp4" });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => chunks.push(event.data);
    const result = new Promise<number[]>((resolve, reject) => {
      recorder.onerror = () => reject(new Error("No se pudo crear el video de prueba."));
      recorder.onstop = () =>
        void new Blob(chunks, { type: "video/mp4" })
          .arrayBuffer()
          .then((buffer) => resolve(Array.from(new Uint8Array(buffer))));
    });
    recorder.start();
    let frame = 0;
    const timer = setInterval(() => {
      context.fillStyle = frame++ % 2 === 0 ? "white" : "black";
      context.fillRect(0, 0, 64, 64);
    }, 50);
    setTimeout(() => {
      clearInterval(timer);
      recorder.stop();
      for (const track of stream.getTracks()) track.stop();
    }, durationMs);
    return result;
  }, durationMs);
  const source = join(directory, "fixture.mp4");
  await writeFile(source, Buffer.from(bytes));

  return source;
}
