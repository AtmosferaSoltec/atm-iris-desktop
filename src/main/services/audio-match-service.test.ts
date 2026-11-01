import { expect, it, vi } from "vitest";
import { AudioMatchService } from "./audio-match-service";

const song = (id: string, title: string, audio: unknown = null): object => ({
  id,
  title,
  author: "",
  audio,
  archivedAt: null,
});
const track = (id: string, fileName: string): object => ({
  asset: { id, kind: "audio", role: "track", fileName, isMissing: false },
});

function setup(owned = new Set<string>()): {
  service: AudioMatchService;
  setSongAudio: ReturnType<typeof vi.fn>;
} {
  const setSongAudio = vi.fn();
  const library = [
    song("11111111-1111-4111-8111-111111111111", "Hosanna"),
    song("22222222-2222-4222-8222-222222222222", "Bendito Jesús"),
    song("33333333-3333-4333-8333-333333333333", "Ya tiene", { id: "x" }),
  ];
  const service = new AudioMatchService(
    {
      songs: () => library,
      setSongAudio,
      importTransaction: (operation: () => unknown) => operation(),
    } as never,
    {
      all: () => [
        track("a1", "HOSANNA.mp3"),
        track("a2", "bendito jesus.mp3"),
        track("a3", "Suelto.mp3"),
        track("a4", "Hosanna.wav"),
      ],
    } as never,
    { audioOwner: (id: string) => (owned.has(id) ? "otra" : null) },
    async () => undefined,
  );
  return { service, setSongAudio };
}

it("proposes pairs for songs without a track and assigns only the chosen ones", async () => {
  const { service, setSongAudio } = setup();
  const preview = await service.preview();
  expect(preview.matches.map((match) => match.title)).toEqual(["Bendito Jesús", "Hosanna"]);
  expect(preview.unmatchedFiles).toEqual(["Suelto.mp3"]);
  expect(setSongAudio).not.toHaveBeenCalled();

  const result = service.confirm({
    token: preview.token,
    songIds: ["11111111-1111-4111-8111-111111111111"],
  });
  expect(result).toEqual({ assigned: 1, skipped: 0 });
  expect(setSongAudio).toHaveBeenCalledOnce();
  expect(setSongAudio).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111", "a1");
});

it("ignores tracks that already belong to a song and refuses a stale preview", async () => {
  const { service } = setup(new Set(["a1"]));
  const first = await service.preview();
  expect(first.matches.map((match) => match.title)).toEqual(["Bendito Jesús"]);
  await service.preview();
  expect(() => service.confirm({ token: first.token, songIds: [] })).toThrow(/venció/);
});
