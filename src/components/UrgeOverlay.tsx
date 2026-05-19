import { useEffect, useState } from "react";

const AFFIRMATIONS = [
  "BREATHE. THE URGE IS A WAVE. RIDE IT.",
  "YOU ARE THE PLAYER, NOT THE GAME.",
  "5 MINUTES. JUST WAIT 5 MINUTES.",
  "FUTURE YOU IS WATCHING. MAKE THEM PROUD.",
  "DISCIPLINE > MOTIVATION.",
  "THE URGE WILL PASS. YOU WILL REMAIN.",
];

export function UrgeOverlay({ onClose }: { onClose: () => void }) {
  const [seconds, setSeconds] = useState(60);
  const [affirmation] = useState(
    () => AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)],
  );
  const [breathPhase, setBreathPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const phases: Array<"in" | "hold" | "out"> = ["in", "hold", "out"];
    let i = 0;
    const t = setInterval(() => {
      i = (i + 1) % phases.length;
      setBreathPhase(phases[i]);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && seconds === 0) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [seconds, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm scanlines crt-flicker">
      <div className="absolute inset-x-0 bottom-0 h-1/2 overflow-hidden opacity-60">
        <div
          className="absolute inset-0 grid-floor"
          style={{ animation: "scroll-grid 1.2s linear infinite" }}
        />
      </div>

      <div className="relative z-10 mx-4 max-w-2xl text-center">
        <div className="mb-6 text-xs neon-text-yellow font-display">!! URGE MODE !!</div>

        <div
          className="mx-auto mb-8 flex h-48 w-48 items-center justify-center rounded-full neon-border transition-all duration-[4000ms] ease-in-out"
          style={{
            transform:
              breathPhase === "in"
                ? "scale(1.3)"
                : breathPhase === "hold"
                ? "scale(1.3)"
                : "scale(0.7)",
          }}
        >
          <div className="font-display text-xs neon-text-pink">
            {breathPhase === "in" ? "INHALE" : breathPhase === "hold" ? "HOLD" : "EXHALE"}
          </div>
        </div>

        <h2 className="mb-4 font-display text-base leading-relaxed neon-text-pink md:text-xl">
          {affirmation}
        </h2>

        <p className="mb-8 text-xl text-muted-foreground">
          The signal will clear in{" "}
          <span className="neon-text-cyan font-display text-2xl">{seconds}</span>s
        </p>

        <button
          onClick={onClose}
          disabled={seconds > 0}
          className="font-display text-xs px-6 py-3 neon-border-cyan bg-transparent text-secondary disabled:opacity-30 disabled:cursor-not-allowed hover:bg-secondary/10 transition-colors"
        >
          {seconds > 0 ? `LOCKED [${seconds}]` : "[ESC] RETURN TO BASE"}
        </button>
      </div>
    </div>
  );
}
