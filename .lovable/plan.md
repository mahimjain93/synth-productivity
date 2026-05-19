## Improve Work Cycle Tracking

Replace the current "Work Cycle (20 min)" quick-ritual card with a richer **Work Cycle** panel. All existing app behavior (XP, streak, missions, urge, shortcuts, header, frame width, other ritual cards) stays unchanged.

### New panel sections

**1. Timer (Pomodoro-style, timestamp-driven)**
- 20 min focus → 5 min break → 20 min focus … long break (15 min) every 4th cycle.
- Controls: `START` / `PAUSE` / `RESET` / `SKIP`.
- Big `MM:SS` countdown in `font-display`, color shifts: pink (focus) / cyan (break).
- Phase label + "Cycle 3 of 4 until long break".
- Uses stored `phaseStartedAt` + `phaseDurationMs` + `pausedRemainingMs` so the countdown is correct even after closing the tab or sleeping the laptop. A 1s `setInterval` recomputes from `Date.now()`.
- When focus phase hits 0: auto-log a cycle (push completed Task `"Work Cycle (20 min)"` with the optional label appended, award +50 XP, fire confetti-style floater), advance to break automatically. Break end → ready for next focus.
- Browser notification + soft beep (WebAudio oscillator, no asset) when a phase ends.

**2. Manual controls**
- `+1` and `−1` buttons next to the cycle count (−1 removes the most recent today's cycle and refunds 50 XP / decrements totalCompleted; clamps at 0).
- Small text input "what are you working on?" — value is saved on the next logged cycle's title as `"Work Cycle (20 min) — <label>"` and shown in history.

**3. Daily goal + progress ring**
- User-editable input "Goal: __ cycles/day" (default 4, persisted).
- Circular SVG progress ring around today's count (stroke = neon-pink, track = border).
- When count first reaches goal: big celebration overlay (XP burst floaters + neon flash + "GOAL SMASHED" banner that auto-dismisses in ~2.5s). Triggers once per day (guard with `lastGoalCelebratedDate`).

**4. 7-day history**
- Mini bar chart (CSS divs, no library) of the last 7 days' cycle counts.
- Bars sized relative to max(goal, max count). Today's bar highlighted. Day labels (M/T/W…) under each bar. Tooltip on hover with exact count.

### Data model changes (`src/lib/storage.ts`)

Extend `AppState` with (all optional with sensible defaults via `defaultState`):
```ts
workCycle: {
  goal: number;                 // default 4
  phase: "idle" | "focus" | "break" | "longBreak";
  phaseStartedAt: number | null;
  phaseDurationMs: number;
  pausedRemainingMs: number | null;  // non-null = paused
  cyclesSinceLongBreak: number;      // 0..3
  currentLabel: string;
  lastGoalCelebratedDate: string | null;
}
```
Cycle history derives from existing `tasks` (filter by title prefix + completedAt date), so no separate history table needed.

### Files touched
- `src/lib/storage.ts` — add `workCycle` slice + defaults; bump storage key suffix or merge via existing `{ ...defaultState, ...parsed }` (already safe).
- `src/components/Dashboard.tsx` — remove Work Cycle entry from the `QuickRituals` rituals array; render new `<WorkCyclePanel state={state} setState={setState} onFloater={...} />` above or in place of Quick Rituals. Morning Protection and Smoking Delayed cards remain.
- `src/components/WorkCyclePanel.tsx` — new component containing timer, manual controls, label input, goal editor, progress ring, history chart, celebration overlay.

### Out of scope (per your reply)
No additional ritual types, no cycle-level notes/journal beyond the single label, no sound settings UI (beep is on by default, can be muted with a tiny 🔊/🔇 toggle in the panel header).
