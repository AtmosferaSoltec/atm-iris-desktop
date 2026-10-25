import { youtubeCommandSchema } from "@shared/schemas/youtube-player";
import { playbackPosition } from "@shared/domain/playback";
import { loadYouTube, isEmbedBlocked, type YouTubePlayer } from "./youtube-api";

// This page has no preload. Its separate origin denies access to the parent and the Iris bridge.
let player: YouTubePlayer | null = null;
let command: ReturnType<typeof youtubeCommandSchema.parse> | null = null;
let hasPlayer = false;
let isReady = false;
function report(value: unknown): void {
  window.parent.postMessage(value, "*");
}
function sync(): void {
  if (!player || !command || !isReady) return;
  if (command.audible) player.unMute();
  else player.mute();
  const target = playbackPosition(command, Date.now());
  if (Math.abs(player.getCurrentTime() - target) > 0.8) player.seekTo(target, true);
  if (command.captions) player.loadModule("captions");
  else player.unloadModule("captions");
  if (command.playing) player.playVideo();
  else player.pauseVideo();
}
window.addEventListener("message", (event) => {
  if (event.source !== window.parent) return;
  const input = youtubeCommandSchema.safeParse(event.data);
  if (!input.success) return;
  command = input.data;
  if (hasPlayer) {
    sync();
    return;
  }
  hasPlayer = true;
  void loadYouTube()
    .then((YT) => {
      if (!command) return;
      player = new YT.Player(document.getElementById("player")!, {
        videoId: command.id,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 0,
          controls: 1,
          disablekb: 1,
          fs: 0,
          playsinline: 1,
          rel: 0,
          mute: 1,
          widget_referrer: "https://com.atmosfera.iris/",
        },
        events: {
          onReady: () => {
            isReady = true;
            sync();
          },
          onStateChange: () => {
            if (player && command) {
              if (command.captions) player.loadModule("captions");
              else player.unloadModule("captions");
            }
          },
          onError: (event) =>
            report({
              type: "iris-youtube:error",
              message: isEmbedBlocked(event.data)
                ? "Este video no se puede reproducir fuera de YouTube."
                : "YouTube no pudo reproducir este video.",
            }),
        },
      });
    })
    .catch(() =>
      report({
        type: "iris-youtube:error",
        message: "Sin conexión. Los videos de YouTube necesitan internet.",
      }),
    );
});
setInterval(() => {
  if (!player || !command || !isReady) return;
  report({
    type: "iris-youtube:time",
    id: command.id,
    position: player.getCurrentTime(),
    duration: player.getDuration(),
  });
}, 500);
window.addEventListener("offline", () =>
  report({
    type: "iris-youtube:error",
    message: "Sin conexión. Los videos de YouTube necesitan internet.",
  }),
);
report({ type: "iris-youtube:ready" });
