## Changes to `src/components/Dashboard.tsx`

**1. Header text**
- `NEON.GRIND` → `Welcome to Mahim Management System (MMS)` (shrink font size so it fits on one line on mobile).
- `// a productivity arcade //` → `// let's move //`

**2. Wider frame**
- Container `max-w-3xl` → `max-w-6xl` and bump horizontal padding (`px-4` → `px-6 md:px-10`) so content uses more of the viewport width.

**3. Quick-Add Rituals grid (new section above Missions)**
A grid of pre-defined task cards the user can tap to log instantly. Each click awards XP via the existing `completeTask` flow (creates a one-off completed task so it counts toward XP/streak/total).

Cards:
- **Morning Protection** — +25 XP, single tap logs it.
- **Work Cycle — 20 min** — +50 XP per cycle. Card shows a local counter `Cycles today: N` derived from completed tasks titled "Work Cycle (20 min)" filtered to today. Tap = +1 cycle (logs a completed task, increments counter, awards XP).
- **Morning Smoking Delayed?** — +30 XP, single tap = "Yes".

Grid layout: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3`, each card styled with `bg-card neon-border-cyan scanlines p-4`, big tap target, title in `font-display`, XP badge in `neon-text-yellow`, and (for Work Cycle) counter in `font-mono text-3xl neon-text-pink`.

Implementation detail: add a helper `logQuickTask(title, xp)` that pushes a completed `Task` into state and runs the same XP/level/streak math as `completeTask`. Counter for work cycles = `state.tasks.filter(t => t.done && t.title === "Work Cycle (20 min)" && completedAt today).length`.

No changes to storage, keyboard shortcuts, urge overlay, or styling tokens.
