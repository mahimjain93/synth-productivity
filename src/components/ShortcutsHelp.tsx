const SHORTCUTS: Array<[string, string]> = [
  ["N", "New task input"],
  ["Enter", "Add task (in input)"],
  ["J / K", "Move selection down / up"],
  ["X / Space", "Complete selected task"],
  ["D", "Delete selected task"],
  ["U", "Activate URGE MODE"],
  ["?", "Toggle this help"],
];

export function ShortcutsHelp({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-md w-full bg-card neon-border-cyan p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-sm neon-text-cyan mb-4">// SHORTCUTS</h3>
        <ul className="space-y-2 text-lg">
          {SHORTCUTS.map(([k, v]) => (
            <li key={k} className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{v}</span>
              <kbd className="font-display text-[10px] px-2 py-1 border border-border bg-input neon-text-pink">
                {k}
              </kbd>
            </li>
          ))}
        </ul>
        <button
          onClick={onClose}
          className="mt-6 w-full font-display text-[10px] py-2 neon-border-cyan hover:bg-secondary/10"
        >
          [ESC] CLOSE
        </button>
      </div>
    </div>
  );
}
