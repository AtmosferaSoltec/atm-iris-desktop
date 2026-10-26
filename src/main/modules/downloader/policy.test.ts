import { expect, it } from "vitest";
import {
  commonArguments,
  downloadArguments,
  validatedDownload,
  parseDownloadProgress,
  downloadFailure,
} from "./policy";

const base = {
  url: "https://youtu.be/M7lc1UVf-VE?list=PLtest&x=--exec",
  format: "mp4" as const,
  quality: "720" as const,
  audioRole: "track" as const,
};
it("only accepts YouTube and constructs a single canonical URL without user arguments", () => {
  expect(validatedDownload(base).url).toBe("https://www.youtube.com/watch?v=M7lc1UVf-VE");
  for (const url of [
    "file:///tmp/video",
    "https://youtube.com.evil/watch?v=M7lc1UVf-VE",
    "--exec touch /tmp/test",
  ])
    expect(() => validatedDownload({ ...base, url })).toThrow();
  expect(() => validatedDownload({ ...base, quality: "720];rm -rf" })).toThrow();
  const args = [
    ...commonArguments("runtime", "tools"),
    ...downloadArguments(base, "/tmp/output.%(ext)s"),
  ];
  expect(args.at(-1)).toBe("https://www.youtube.com/watch?v=M7lc1UVf-VE");
  expect(args).not.toContain("--exec");
  expect(args).toContain("--no-playlist");
});
it("builds MP3 extraction and H264 MP4 selection with bounded size", () => {
  expect(downloadArguments({ ...base, format: "mp3" }, "file.%(ext)s")).toEqual(
    expect.arrayContaining(["-x", "--audio-format", "mp3", "--max-filesize", "209715200"]),
  );
  expect(downloadArguments(base, "file.%(ext)s").join(" ")).toContain("vcodec^=avc1");
  expect(commonArguments("C:\\Iris App\\Iris.exe", "C:\\Tools")).toEqual(
    expect.arrayContaining([
      "node:C:\\Iris App\\Iris.exe",
      "--ignore-config",
      "--no-plugin-dirs",
      "--no-remote-components",
    ]),
  );
});
it("parses bounded machine-readable progress and maps external errors to Spanish", () => {
  expect(parseDownloadProgress("IRIS_PROGRESS:50:100")).toBe(50);
  expect(parseDownloadProgress("IRIS_PROGRESS:200:100")).toBe(99);
  for (const line of ["ordinary output", "IRIS_PROGRESS:1:0", "IRIS_PROGRESS:NA:NA"])
    expect(parseDownloadProgress(line)).toBeNull();
  expect(downloadFailure("Sign in to confirm your age").message).toContain("confirmar la edad");
  expect(downloadFailure("copyright blocked").message).toContain("no está disponible");
  expect(downloadFailure("connection timed out").message).toContain("conexión");
});
