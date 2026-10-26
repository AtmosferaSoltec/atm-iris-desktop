import { playbackPosition, shouldSeekVideo } from "@shared/domain/playback";
import { memo, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@renderer/lib/cn";
import { clock } from "@shared/lib/format";
import {
  fontStack,
  lyricSizes,
  timerRemaining,
  type ProjectionBackground,
  type ProjectionContent,
  type ProjectionFrame,
  type ProjectionTypography,
} from "@shared/domain/projection";

type VideoTime = { id: string; position: number; duration: number };

type Props = {
  frame: ProjectionFrame;
  /** Cross-fade between backgrounds and between contents (screen and EN VIVO). Cards switch instantly. */
  transitions?: boolean;
  /** Draw the real video and loop video backgrounds. Off for slide cards. */
  playsVideo?: boolean;
  /** The screen reports where its video is, so the console's player follows it. */
  onVideoTime?: (time: VideoTime) => void;
  audible?: boolean;
  onVideoError?: (message: string) => void;
  className?: string;
  children?: ReactNode;
};

const FADE_MS = 450;
/** Contents go out, then in: the old lyrics are gone before the new ones show. */
const CONTENT_OUT_MS = 200;
const CONTENT_IN_MS = 260;

/**
 * Draws a `ProjectionFrame` in 16:9 at any size (IRIS_SPEC §5.12): black, then the
 * background (gradient, image or looping muted video, with a 20 % veil for contrast),
 * then the content. Everything is sized in container-query units, so a card, the live
 * preview and the TV are the same picture at different sizes.
 */
export function ProjectionCanvas({
  frame,
  transitions = false,
  playsVideo = false,
  onVideoTime,
  audible = false,
  onVideoError,
  className,
  children,
}: Props) {
  return (
    <div
      className={cn(
        "@container relative aspect-video overflow-hidden bg-black select-none",
        className,
      )}
    >
      <Layers value={frame.background} keyOf={(b) => b?.id ?? "none"} transitions={transitions}>
        {(background) =>
          background && <Background background={background} playsVideo={playsVideo} />
        }
      </Layers>
      <Sequence value={frame.content} keyOf={contentKey} transitions={transitions}>
        {(content) => (
          <Content
            content={content}
            typography={frame.typography}
            playsVideo={playsVideo}
            onVideoTime={onVideoTime}
            audible={audible}
            onVideoError={onVideoError}
          />
        )}
      </Sequence>
      {children}
    </div>
  );
}

/** Same id while the same thing is shown: a video that pauses or seeks keeps its element. */
function contentKey(content: ProjectionContent): string {
  switch (content.kind) {
    case "blank":
      return "blank";
    case "text":
      return `text:${content.text}\u0000${content.footnote ?? ""}`;
    case "timer":
      return "timer";
    case "image":
    case "video":
      return `${content.kind}:${content.id}`;
  }
}

/**
 * Backgrounds cross-fade: the outgoing one stays under the incoming one until it has faded
 * in, so a change never flashes black. Without transitions it simply swaps.
 */
function Layers<T>({
  value,
  keyOf,
  transitions,
  children,
}: {
  value: T;
  keyOf: (value: T) => string;
  transitions: boolean;
  children: (value: T) => ReactNode;
}) {
  const key = keyOf(value);
  const [layers, setLayers] = useState([{ key, value }]);

  // A new key stacks on top; the same key just takes the new value (a video's play state).
  if (layers.at(-1)!.key !== key) {
    setLayers((current) => [...(transitions ? current.slice(-1) : []), { key, value }]);
  } else if (layers.at(-1)!.value !== value) {
    setLayers((current) => [...current.slice(0, -1), { key, value }]);
  }

  useEffect(() => {
    if (layers.length < 2) return;
    const timer = setTimeout(() => setLayers((current) => current.slice(-1)), FADE_MS);
    return () => clearTimeout(timer);
  }, [layers.length]);

  return layers.map((layer, index) => (
    <div
      key={layer.key}
      className="absolute inset-0"
      style={
        transitions && index === layers.length - 1 && layers.length > 1
          ? { animation: `projection-fade ${FADE_MS}ms ease-out both` }
          : undefined
      }
    >
      {children(layer.value)}
    </div>
  ));
}

type Layer<T> = { key: string; value: T };

/**
 * The content (lyrics, an image, a video): the one on screen fades out first and only then
 * the next fades in, so two slides never mix. A change that comes while one is leaving just
 * becomes the next to come in. The same key only takes the new value (a video's play state).
 */
function Sequence<T>({
  value,
  keyOf,
  transitions,
  children,
}: {
  value: T;
  keyOf: (value: T) => string;
  transitions: boolean;
  children: (value: T) => ReactNode;
}) {
  const key = keyOf(value);
  const [state, setState] = useState<{
    current: Layer<T>;
    leaving: Layer<T> | null;
    /** The current one came in after another: it fades in. */
    entering: boolean;
  }>({ current: { key, value }, leaving: null, entering: false });

  if (state.current.key !== key) {
    setState({
      current: { key, value },
      // Already leaving: that one keeps leaving; the new one waits its turn.
      leaving: transitions ? (state.leaving ?? state.current) : null,
      entering: transitions,
    });
  } else if (state.current.value !== value) {
    setState({ ...state, current: { key, value } });
  }

  useEffect(() => {
    if (!state.leaving) return;
    const timer = setTimeout(() => setState((now) => ({ ...now, leaving: null })), CONTENT_OUT_MS);
    return () => clearTimeout(timer);
  }, [state.leaving]);

  const layer = state.leaving ?? state.current;
  return (
    <div
      // The same element fades out (no remount: a leaving video does not reload).
      key={layer.key}
      className="absolute inset-0"
      style={
        state.leaving
          ? { animation: `projection-fade-out ${CONTENT_OUT_MS}ms ease-in both` }
          : state.entering
            ? { animation: `projection-fade ${CONTENT_IN_MS}ms ease-out both` }
            : undefined
      }
    >
      {children(layer.value)}
    </div>
  );
}

const Background = memo(function Background({
  background,
  playsVideo,
}: {
  background: ProjectionBackground;
  playsVideo: boolean;
}) {
  const [from, via = from, to = via] = background.colors;
  const videoUrl = background.videoUrl && background.videoUrl;
  const imageUrl = background.imageUrl && background.imageUrl;
  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(120% 80% at 50% 0%, rgb(255 255 255 / 0.14), transparent 60%), linear-gradient(135deg, ${from}, ${via}, ${to})`,
        }}
      />
      {videoUrl ? (
        playsVideo ? (
          <video
            className="absolute inset-0 size-full object-cover"
            src={videoUrl}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
          />
        ) : (
          // A still frame for thumbnails: only the metadata and the first frame load.
          <video
            className="absolute inset-0 size-full object-cover"
            src={`${videoUrl}#t=0.5`}
            muted
            playsInline
            preload="metadata"
            tabIndex={-1}
          />
        )
      ) : imageUrl ? (
        <img
          className="absolute inset-0 size-full object-cover"
          src={imageUrl}
          alt=""
          decoding="async"
          draggable={false}
        />
      ) : null}
      <div className="absolute inset-0 bg-black/20" />
    </div>
  );
});

function Content({
  content,
  typography,
  playsVideo,
  onVideoTime,
  audible,
  onVideoError,
}: {
  content: ProjectionContent;
  typography: ProjectionTypography;
  playsVideo: boolean;
  onVideoTime?: (time: VideoTime) => void;
  audible: boolean;
  onVideoError?: (message: string) => void;
}) {
  switch (content.kind) {
    case "blank":
      return null;
    case "timer":
      return <Countdown timer={content} typography={typography} />;
    case "text":
      return <Lyrics text={content.text} footnote={content.footnote} typography={typography} />;
    case "image":
      return (
        <img
          className="absolute inset-0 size-full object-contain"
          src={content.url}
          alt=""
          decoding="async"
          draggable={false}
        />
      );
    case "video":
      return playsVideo ? (
        <Video
          content={content}
          audible={audible}
          onVideoTime={onVideoTime}
          onVideoError={onVideoError}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          {/* A still frame: only the metadata and the first frame load. */}
          <video
            className="absolute inset-0 size-full object-contain"
            src={`${content.url}#t=0.5`}
            muted
            playsInline
            preload="metadata"
            tabIndex={-1}
          />
          <span className="relative grid size-[13cqw] place-items-center rounded-full bg-black/40 ring-1 ring-white/30 backdrop-blur-sm">
            <span className="ml-[1cqw] border-y-[2.4cqw] border-l-[3.8cqw] border-y-transparent border-l-white" />
          </span>
        </div>
      );
  }
}

/** Shrinks the lyrics (down to half) when a long slide would not fit the screen. */
/** The big countdown on the screen: it follows `at` itself, so it only needs a new frame to start, pause or reset. */
function Countdown({
  timer,
  typography,
}: {
  timer: Extract<ProjectionContent, { kind: "timer" }>;
  typography: ProjectionTypography;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!timer.running) return;
    const interval = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(interval);
  }, [timer.running]);
  const left = timerRemaining(timer, Math.max(now, timer.at));
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-[3cqw] px-[7cqw] text-center text-white [text-shadow:0_0_1.2cqw_rgb(0_0_0/0.45)]"
      style={{
        fontFamily: fontStack(typography.fontFamily),
        fontWeight: typography.fontBold ? 700 : 500,
      }}
    >
      {timer.label && <span className="text-[5.5cqw] leading-tight">{timer.label}</span>}
      <span className="text-[24cqw] leading-none tabular-nums">{clock(Math.ceil(left))}</span>
    </div>
  );
}

function Lyrics({
  text,
  footnote,
  typography,
}: {
  text: string;
  footnote: string | null;
  typography: ProjectionTypography;
}) {
  const box = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const sizes = lyricSizes(typography);

  useLayoutEffect(() => {
    const outer = box.current;
    const content = inner.current;
    if (!outer || !content) return;
    const fit = () => {
      content.style.setProperty("--fit", "1");
      const room = outer.clientHeight;
      const needed = content.scrollHeight;
      setScale(needed > room && needed > 0 ? Math.max(0.5, room / needed) : 1);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(outer);
    return () => observer.disconnect();
  }, [text, footnote, sizes.body]);

  return (
    <div
      ref={box}
      className="absolute inset-[7cqw] flex flex-col items-center justify-center text-center text-white [text-shadow:0_0_1.2cqw_rgb(0_0_0/0.45)]"
      style={{
        fontFamily: fontStack(typography.fontFamily),
        fontWeight: typography.fontBold ? 700 : 500,
        fontStyle: typography.fontItalic ? "italic" : "normal",
        textTransform: typography.uppercase ? "uppercase" : "none",
      }}
    >
      <div
        ref={inner}
        className="flex flex-col items-center gap-[2.5cqw]"
        style={{ fontSize: `calc(${sizes.body} * var(--fit, 1))`, ["--fit" as string]: scale }}
      >
        <p className="leading-[1.22] whitespace-pre-line">{text}</p>
        {footnote && (
          <p
            className="font-semibold tracking-[0.3cqw] uppercase opacity-60"
            style={{ fontSize: `calc(${sizes.footnote} * var(--fit, 1))` }}
          >
            {footnote}
          </p>
        )}
      </div>
    </div>
  );
}

/** The video on screen follows the console: playing from a position at a moment, or paused there. */
function Video({
  onVideoError,
  audible,
  content,
  onVideoTime,
}: {
  audible: boolean;
  onVideoError?: (message: string) => void;
  content: Extract<ProjectionContent, { kind: "video" }>;
  onVideoTime?: (time: VideoTime) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.volume = content.volume ?? 1;
    const target = playbackPosition(content, Date.now());
    if (shouldSeekVideo(video.currentTime, target)) video.currentTime = target;
    if (content.playing) void video.play().catch(() => undefined);
    else video.pause();
  }, [content]);

  return (
    <video
      ref={ref}
      onError={() => onVideoError?.("No pudimos reproducir el video. Revisa el archivo.")}
      className="absolute inset-0 size-full bg-black object-contain"
      src={content.url}
      muted={!audible || Boolean(content.muted)}
      playsInline
      preload="auto"
      onTimeUpdate={(event) =>
        onVideoTime?.({
          id: content.id,
          position: event.currentTarget.currentTime,
          duration: event.currentTarget.duration || 0,
        })
      }
    />
  );
}
