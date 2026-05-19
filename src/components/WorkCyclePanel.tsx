import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  BREAK_MS,
  FOCUS_MS,
  LONG_BREAK_MS,
  WORK_CYCLE_TITLE,
  todayStr,
  xpForLevel,
  yesterdayStr,
  type AppState,
  type Task,
  type WorkPhase,
} from "@/lib/storage";

const CYCLE_XP = 50;

function fmt(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
}

function dateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function beep(muted: boolean, kind: "focus-end" | "break-end") {
  if (muted) return;
  try {
    const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    const ctx = new AC();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = kind === "focus-end" ? 880 : 523;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.65);
    setTimeout(() => ctx.close(), 800);
  } catch {
    // ignore
  }
}

function notify(title: string, body: string) {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(title, { body });
    }
  } catch {
    // ignore
  }
}

export function WorkCyclePanel({
  state,
  setState,
  onFloater,
}: {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  onFloater: (xp: number) => void;
}) {
  const wc = state.workCycle;
  const [now, setNow] = useState(() => Date.now());
  const [celebrate, setCelebrate] = useState(false);
  const phaseEndRef = useRef<number | null>(null);

  // tick
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  // request notif permission lazily on first start
  const ensurePerm = () => {
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        Notification.requestPermission();
      }
    } catch {
      // ignore
    }
  };

  const remaining = useMemo(() => {
    if (wc.phase === "idle") return wc.phaseDurationMs;
    if (wc.pausedRemainingMs != null) return wc.pausedRemainingMs;
    if (!wc.phaseStartedAt) return wc.phaseDurationMs;
    return wc.phaseStartedAt + wc.phaseDurationMs - now;
  }, [wc, now]);

  const todayCycles = useMemo(() => {
    const t = todayStr();
    return state.tasks.filter(
      (x) =>
        x.done &&
        x.title.startsWith(WORK_CYCLE_TITLE) &&
        x.completedAt &&
        dateStr(new Date(x.completedAt)) === t,
    );
  }, [state.tasks]);

  const cycleCount = todayCycles.length;

  // 7-day history (oldest -> today)
  const history = useMemo(() => {
    const days: Array<{ key: string; label: string; count: number; isToday: boolean }> = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = dateStr(d);
      const count = state.tasks.filter(
        (x) =>
          x.done &&
          x.title.startsWith(WORK_CYCLE_TITLE) &&
          x.completedAt &&
          dateStr(new Date(x.completedAt)) === key,
      ).length;
      days.push({
        key,
        label: ["S", "M", "T", "W", "T", "F", "S"][d.getDay()],
        count,
        isToday: i === 0,
      });
    }
    return days;
  }, [state.tasks]);

  const maxBar = Math.max(wc.goal, ...history.map((d) => d.count), 1);

  // Helpers to mutate workCycle + log/refund cycles, sharing xp/streak math
  function logCycle(label: string) {
    setState((s) => {
      const today = todayStr();
      let streak = s.streak;
      if (s.lastCompletionDate !== today) {
        streak = s.lastCompletionDate === yesterdayStr() ? s.streak + 1 : 1;
      }
      let xpRem = s.xp + CYCLE_XP;
      let level = s.level;
      while (xpRem >= xpForLevel(level)) {
        xpRem -= xpForLevel(level);
        level += 1;
      }
      const title = label.trim() ? `${WORK_CYCLE_TITLE} — ${label.trim()}` : WORK_CYCLE_TITLE;
      const t: Task = {
        id: crypto.randomUUID(),
        title,
        xp: CYCLE_XP,
        done: true,
        createdAt: Date.now(),
        completedAt: Date.now(),
      };
      return {
        ...s,
        tasks: [t, ...s.tasks],
        xp: xpRem,
        level,
        streak,
        lastCompletionDate: today,
        totalCompleted: s.totalCompleted + 1,
      };
    });
    onFloater(CYCLE_XP);
  }

  function removeLastCycle() {
    setState((s) => {
      const today = todayStr();
      const idx = s.tasks.findIndex(
        (x) =>
          x.done &&
          x.title.startsWith(WORK_CYCLE_TITLE) &&
          x.completedAt &&
          dateStr(new Date(x.completedAt)) === today,
      );
      if (idx === -1) return s;
      const next = s.tasks.slice();
      next.splice(idx, 1);
      // refund xp (clamp to 0, don't roll level back to avoid weirdness)
      const xp = Math.max(0, s.xp - CYCLE_XP);
      return {
        ...s,
        tasks: next,
        xp,
        totalCompleted: Math.max(0, s.totalCompleted - 1),
      };
    });
  }

  function setWC(patch: Partial<AppState["workCycle"]>) {
    setState((s) => ({ ...s, workCycle: { ...s.workCycle, ...patch } }));
  }

  // Auto-transition on phase end
  useEffect(() => {
    if (wc.phase === "idle" || wc.pausedRemainingMs != null || !wc.phaseStartedAt) {
      phaseEndRef.current = null;
      return;
    }
    const endAt = wc.phaseStartedAt + wc.phaseDurationMs;
    if (now < endAt) return;
    // prevent double-firing
    if (phaseEndRef.current === endAt) return;
    phaseEndRef.current = endAt;

    if (wc.phase === "focus") {
      logCycle(wc.currentLabel);
      beep(wc.muted, "focus-end");
      notify("Focus complete", "Time for a break.");
      const nextCount = wc.cyclesSinceLongBreak + 1;
      const longBreak = nextCount >= 4;
      setWC({
        phase: longBreak ? "longBreak" : "break",
        phaseStartedAt: Date.now(),
        phaseDurationMs: longBreak ? LONG_BREAK_MS : BREAK_MS,
        pausedRemainingMs: null,
        cyclesSinceLongBreak: longBreak ? 0 : nextCount,
        currentLabel: "",
      });
    } else {
      beep(wc.muted, "break-end");
      notify("Break over", "Ready for the next cycle.");
      setWC({
        phase: "idle",
        phaseStartedAt: null,
        phaseDurationMs: FOCUS_MS,
        pausedRemainingMs: null,
      });
    }
  }, [now, wc]); // eslint-disable-line react-hooks/exhaustive-deps

  // Celebration when goal reached
  useEffect(() => {
    const today = todayStr();
    if (cycleCount >= wc.goal && wc.lastGoalCelebratedDate !== today) {
      setCelebrate(true);
      setWC({ lastGoalCelebratedDate: today });
      const t = setTimeout(() => setCelebrate(false), 2500);
      // bonus floaters
      onFloater(0);
      return () => clearTimeout(t);
    }
  }, [cycleCount, wc.goal]); // eslint-disable-line react-hooks/exhaustive-deps

  // Controls
  function startFocus() {
    ensurePerm();
    setWC({
      phase: "focus",
      phaseStartedAt: Date.now(),
      phaseDurationMs: FOCUS_MS,
      pausedRemainingMs: null,
    });
  }
  function pause() {
    if (wc.phase === "idle" || wc.pausedRemainingMs != null) return;
    setWC({ pausedRemainingMs: remaining });
  }
  function resume() {
    if (wc.pausedRemainingMs == null) return;
    setWC({
      phaseStartedAt: Date.now(),
      phaseDurationMs: wc.pausedRemainingMs,
      pausedRemainingMs: null,
    });
  }
  function reset() {
    setWC({
      phase: "idle",
      phaseStartedAt: null,
      phaseDurationMs: FOCUS_MS,
      pausedRemainingMs: null,
      cyclesSinceLongBreak: 0,
    });
  }
  function skip() {
    // force end of current phase
    setWC({ phaseStartedAt: Date.now() - wc.phaseDurationMs - 1, pausedRemainingMs: null });
  }

  const phaseLabel: Record<WorkPhase, string> = {
    idle: "READY",
    focus: "FOCUS",
    break: "BREAK",
    longBreak: "LONG BREAK",
  };
  const isFocus = wc.phase === "focus";
  const isBreak = wc.phase === "break" || wc.phase === "longBreak";
  const accentText = isBreak ? "neon-text-cyan" : "neon-text-pink";
  const accentBorder = isBreak ? "neon-border-cyan" : "neon-border";

  // Progress ring math
  const ringSize = 132;
  const stroke = 10;
  const r = (ringSize - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, cycleCount / Math.max(1, wc.goal));
  const dashOffset = circ * (1 - pct);

  const paused = wc.pausedRemainingMs != null;
  const cyclesToLong = 4 - wc.cyclesSinceLongBreak;

  return (
    <div className={`mb-6 bg-card ${accentBorder} p-4 relative scanlines`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`font-display text-xs ${accentText}`}>// WORK CYCLE</h2>
        <button
          onClick={() => setWC({ muted: !wc.muted })}
          className="font-display text-[10px] px-2 py-1 border border-border hover:border-primary/60"
          aria-label={wc.muted ? "Unmute" : "Mute"}
          title={wc.muted ? "Unmute beeps" : "Mute beeps"}
        >
          {wc.muted ? "🔇" : "🔊"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-start">
        {/* Left: timer + controls + label */}
        <div>
          <div className="flex items-baseline gap-3 mb-1">
            <span className={`font-display text-[10px] ${accentText}`}>
              {phaseLabel[wc.phase]}
            </span>
            {wc.phase !== "idle" && (
              <span className="font-mono text-xs text-muted-foreground">
                {isFocus ? `${cyclesToLong} until long break` : "auto-resumes after break"}
              </span>
            )}
            {paused && (
              <span className="font-display text-[10px] neon-text-yellow">[PAUSED]</span>
            )}
          </div>

          <div className={`font-display text-5xl md:text-6xl ${accentText} crt-flicker leading-none mb-3`}>
            {fmt(remaining)}
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {wc.phase === "idle" ? (
              <button
                onClick={startFocus}
                className="font-display text-[10px] px-3 py-2 neon-border bg-transparent neon-text-pink hover:bg-primary/10"
              >
                ▶ START
              </button>
            ) : paused ? (
              <button
                onClick={resume}
                className="font-display text-[10px] px-3 py-2 neon-border bg-transparent neon-text-pink hover:bg-primary/10"
              >
                ▶ RESUME
              </button>
            ) : (
              <button
                onClick={pause}
                className="font-display text-[10px] px-3 py-2 neon-border-cyan bg-transparent neon-text-cyan hover:bg-secondary/10"
              >
                ❚❚ PAUSE
              </button>
            )}
            <button
              onClick={skip}
              disabled={wc.phase === "idle"}
              className="font-display text-[10px] px-3 py-2 border border-border hover:border-primary/60 disabled:opacity-40"
            >
              SKIP
            </button>
            <button
              onClick={reset}
              className="font-display text-[10px] px-3 py-2 border border-destructive text-destructive hover:bg-destructive/20"
            >
              RESET
            </button>
          </div>

          <input
            value={wc.currentLabel}
            onChange={(e) => setWC({ currentLabel: e.target.value })}
            placeholder="what are you working on?"
            className="w-full bg-input border border-border px-3 py-2 font-mono text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:neon-border-cyan"
          />
        </div>

        {/* Right: progress ring + manual ± */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative" style={{ width: ringSize, height: ringSize }}>
            <svg width={ringSize} height={ringSize} className="-rotate-90">
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={r}
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth={stroke}
                opacity={0.5}
              />
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={r}
                fill="none"
                stroke="currentColor"
                className="neon-text-pink"
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={dashOffset}
                style={{
                  transition: "stroke-dashoffset 0.6s ease",
                  filter: "drop-shadow(0 0 6px currentColor)",
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-display text-3xl neon-text-pink leading-none">{cycleCount}</div>
              <div className="font-mono text-xs text-muted-foreground mt-1">
                / {wc.goal}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={removeLastCycle}
              disabled={cycleCount === 0}
              className="font-display text-xs px-3 py-1 border border-border hover:border-destructive disabled:opacity-40"
              aria-label="Remove last cycle"
            >
              −1
            </button>
            <button
              onClick={() => logCycle(wc.currentLabel)}
              className="font-display text-xs px-3 py-1 neon-border-cyan hover:bg-secondary/20"
              aria-label="Add cycle"
            >
              +1
            </button>
          </div>

          <label className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            goal:
            <input
              type="number"
              min={1}
              max={24}
              value={wc.goal}
              onChange={(e) =>
                setWC({ goal: Math.max(1, Math.min(24, Number(e.target.value) || 1)) })
              }
              className="w-14 bg-input border border-border px-2 py-1 font-mono text-sm text-foreground focus:outline-none focus:neon-border-cyan"
            />
            /day
          </label>
        </div>
      </div>

      {/* 7-day history */}
      <div className="mt-5 pt-4 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="font-display text-[10px] neon-text-cyan">// LAST 7 DAYS</span>
          <span className="font-mono text-xs text-muted-foreground">
            total {history.reduce((a, b) => a + b.count, 0)}
          </span>
        </div>
        <div className="flex items-end gap-2 h-20">
          {history.map((d) => {
            const h = (d.count / maxBar) * 100;
            const reachedGoal = d.count >= wc.goal;
            return (
              <div key={d.key} className="flex-1 flex flex-col items-center gap-1" title={`${d.key}: ${d.count} cycles`}>
                <div className="w-full flex-1 flex items-end">
                  <div
                    className={`w-full transition-all ${
                      d.isToday
                        ? "bg-primary"
                        : reachedGoal
                        ? "bg-secondary"
                        : "bg-muted-foreground/40"
                    }`}
                    style={{
                      height: `${Math.max(d.count > 0 ? 6 : 2, h)}%`,
                      boxShadow: d.isToday ? "0 0 8px hsl(var(--primary))" : undefined,
                    }}
                  />
                </div>
                <span
                  className={`font-mono text-[10px] ${
                    d.isToday ? "neon-text-pink" : "text-muted-foreground"
                  }`}
                >
                  {d.label}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">{d.count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {celebrate && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-primary/10 animate-pulse" />
          <div className="relative font-display text-3xl md:text-5xl neon-text-pink crt-flicker text-center px-6 py-4 bg-card neon-border scanlines">
            !! GOAL SMASHED !!
            <div className="mt-2 font-mono text-base neon-text-cyan">
              {wc.goal} cycles · keep going
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
