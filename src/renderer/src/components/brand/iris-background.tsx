/** Static ambient background (IrisBackground): spectrum glows over the canvas plus a vignette. */
export function IrisBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 bg-canvas"
      style={{
        backgroundImage: [
          "radial-gradient(60% 55% at 0% 0%, var(--color-glow-violet), transparent 70%)",
          "radial-gradient(55% 50% at 100% 0%, var(--color-glow-indigo), transparent 70%)",
          "radial-gradient(55% 55% at 0% 100%, var(--color-glow-rose), transparent 70%)",
          "radial-gradient(45% 45% at 45% 100%, var(--color-glow-ember), transparent 70%)",
        ].join(","),
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_25%,rgb(7_7_11/0.7)_90%)]" />
    </div>
  );
}
