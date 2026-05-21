## Goal
Expand Urge Mode into a coping toolkit + journaling log so each urge episode is recorded with timestamp, reason, outcome, and which coping tool helped.

## Changes

### 1. `src/lib/storage.ts` — new types + helpers
Add a separate localStorage key `synthwave-urge-log-v1` (kept independent of main AppState so it's a clean "file" of urges).
```ts
export type UrgeAction = "breathing" | "walk" | "water" | "stretch" | "cold-water";
export interface UrgeEntry {
  id: string;
  startedAt: number;      // when overlay opened
  endedAt: number;        // when closed
  reason?: string;        // user journal text
  defeated: boolean;      // user marked "urge passed" vs "gave in"
  actionsUsed: UrgeAction[]; // which suggestion buttons they clicked
}
```
Helpers: `loadUrgeLog()`, `saveUrgeEntry(entry)`, `loadUrgeLogSorted()` (desc by startedAt).

### 2. `src/components/UrgeOverlay.tsx` — expand UI
Keep the breathing ring + 60s lock. Add below it:
- **Coping actions row** (buttons, multi-tap allowed, each click toggles into `actionsUsed`):
  - Breathing (already present — auto-tracked)
  - Take a walk
  - Drink water
  - Stretch
  - Splash cold water
  Each shows a brief instruction tooltip/sub-line when active.
- **Journal textarea**: "what triggered this urge?" (optional, max 1000 chars, validated).
- **Outcome buttons** (replace single close button after 60s):
  - `[ I DEFEATED IT ]` → saves entry with `defeated: true`, closes.
  - `[ I GAVE IN ]` → saves entry with `defeated: false`, closes (no shame; logged honestly).
- On close (either button or ESC), call `saveUrgeEntry`. ESC defaults to `defeated: true` only if user explicitly clicked an outcome; otherwise save as `defeated: null`-equivalent → simplest: ESC = "dismissed" with `defeated: false` and no actions counted. Better: require user to pick an outcome to close after 60s; ESC just blurs.

Component receives `onClose(entry: UrgeEntry)` so Dashboard can persist.

### 3. New `src/components/UrgeLog.tsx` — history viewer
Dialog/modal triggered from a small `[ LOG ]` button next to the URGE button on the dashboard. Shows entries grouped by date (newest first):
```
2026-05-21
  14:32  ✓ DEFEATED  · "work stress" · [breathing, walk]
  09:10  ✗ GAVE IN   · (no note)     · [breathing]
2026-05-20
  ...
```
Empty state: "no urges logged yet."

### 4. `src/components/Dashboard.tsx`
- Add `urgeLogOpen` state + small `[ LOG ]` button beside `!! URGE [U] !!`.
- Update `<UrgeOverlay onClose={...} />` to persist the returned entry via `saveUrgeEntry`.
- Render `<UrgeLog />` modal.

## Notes
- All data stays in localStorage (no backend), matching the rest of the app.
- Reason text validated with simple `.trim().slice(0, 1000)`.
- Outcome wording avoids shame ("gave in" framed neutrally; we can soften to "urge won this round" if preferred).
- 60s breathing lock preserved.

## Open question
Should ESC after 60s auto-save as "defeated" (assume closing = made it through), or require an explicit outcome click? Default in plan: require explicit outcome — keeps the log honest.