export interface Task {
  id: string;
  title: string;
  xp: number;
  done: boolean;
  createdAt: number;
  completedAt?: number;
}

export interface AppState {
  tasks: Task[];
  xp: number;
  level: number;
  streak: number;
  lastCompletionDate: string | null; // YYYY-MM-DD
  totalCompleted: number;
}

const KEY = "synthwave-productivity-v1";

export const defaultState: AppState = {
  tasks: [],
  xp: 0,
  level: 1,
  streak: 0,
  lastCompletionDate: null,
  totalCompleted: 0,
};

export function loadState(): AppState {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState;
    return { ...defaultState, ...JSON.parse(raw) };
  } catch {
    return defaultState;
  }
}

export function saveState(s: AppState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function xpForLevel(level: number) {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}
