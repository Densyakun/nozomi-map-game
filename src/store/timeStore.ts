import { create } from 'zustand';
import type { GameTime } from '@/lib/types';

interface TimeState {
  gameTime: GameTime;
  speed: 0 | 1 | 2 | 5 | 10;
  paused: boolean;
}

interface TimeActions {
  setGameTime: (time: GameTime) => void;
  setSpeed: (speed: 0 | 1 | 2 | 5 | 10) => void;
  setPaused: (paused: boolean) => void;
  togglePause: () => void;
  reset: () => void;
}

const defaultGameTime: GameTime = { year: 2026, month: 4, day: 1, hour: 6, minute: 0 };

const defaultState: TimeState = {
  gameTime: { ...defaultGameTime },
  speed: 1,
  paused: false,
};

function advanceTime(time: GameTime, minutes: number): GameTime {
  let { year, month, day, hour, minute } = time;
  minute += minutes;

  while (minute >= 60) { minute -= 60; hour += 1; }
  while (minute < 0) { minute += 60; hour -= 1; }

  while (hour >= 24) { hour -= 24; day += 1; }
  while (hour < 0) { hour += 24; day -= 1; }

  const daysInMonth = 30;
  while (day > daysInMonth) { day -= daysInMonth; month += 1; }
  while (day < 1) { day += daysInMonth; month -= 1; }

  while (month > 12) { month -= 12; year += 1; }
  while (month < 1) { month += 12; year -= 1; }

  return { year, month, day, hour, minute };
}

export const useTimeStore = create<TimeState & TimeActions>()((set) => ({
  ...defaultState,

  setGameTime: (gameTime) => set({ gameTime }),

  setSpeed: (speed) => set({ speed }),

  setPaused: (paused) => set({ paused }),

  togglePause: () => set((state) => ({ paused: !state.paused })),

  reset: () => set({ ...defaultState }),
}));

export { advanceTime };
