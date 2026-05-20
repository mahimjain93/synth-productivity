
## Intent

This is a momentum app for burnout / neurodivergent users. Every ritual is equal — no hierarchy, no "quick" labeling, no implicit "work first" framing. Layout and copy changes below reflect that.

## Changes

### 1. Equalize cards — single side-by-side row
**File:** `src/components/Dashboard.tsx`

- Remove the separate `<WorkCyclePanel>` block and the `<QuickRituals>` section header.
- Render Work Cycle and each ritual (Morning Protection, Smoking Delayed?) as **siblings in one grid**, all equally sized:
  ```
  grid grid-cols-1 md:grid-cols-3 gap-4
  ```
- Drop the `// QUICK RITUALS` heading entirely. No replacement heading.
- Widen the page frame: change `max-w-6xl` → `max-w-7xl` on the main container so cards have breathing room without huge side gutters.

### 2. Work Cycle card: compact layout to fit a 3-up grid
**File:** `src/components/WorkCyclePanel.tsx`

- Switch the inner `grid-cols-[1fr_auto]` (timer | ring) layout to a **vertical stack** so the card fits a 1/3-width column on desktop. Timer + controls on top, progress ring + ±1 + goal below.
- Remove the inline 7-day history section. Replace with a single button inside the card:
  ```
  [ // LAST 7 DAYS ]
  ```
  Clicking it opens a Dialog (`@/components/ui/dialog`) showing the existing mini bar chart + totals.
- Change the goal label from `/day` → `today` (input stays the same).

### 3. History modal
**File:** `src/components/WorkCyclePanel.tsx` (same file, new local component or inline `<Dialog>`)

- Use the existing shadcn `Dialog` primitive.
- Content: title "Last 7 Days", the existing bar chart (reuse the `history` + `maxBar` computation), total at the top.
- Triggered by the new button; closeable via X / Esc / overlay click (default Dialog behavior).

### 4. Out of scope

- No business-logic changes (XP, streak, storage shape, timer math all untouched).
- No styling/token overhaul — reuse existing neon classes.
- Rituals data (`Morning Protection`, `Morning Smoking Delayed?`) unchanged.

## Technical notes

- `QuickRituals` becomes either inlined or refactored to render **individual ritual cards** that the parent `Dashboard` places into the unified 3-column grid alongside `<WorkCyclePanel>`. Simplest path: export a `RitualCard` and map over the rituals array directly in `Dashboard`, dropping the `QuickRituals` wrapper.
- Work Cycle card will be visually denser at md breakpoint; at `sm` the grid collapses to 1-col so nothing gets cramped.
- Dialog import: `Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger` from `@/components/ui/dialog`.
