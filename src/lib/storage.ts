import { useGameStore } from '@/store/gameStore';

const SAVE_KEY_PREFIX = 'nozomi-map-game-save-';
const SAVE_INDEX_KEY = 'nozomi-map-game-save-index';

export interface SaveSlot {
  id: string;
  name: string;
  timestamp: number;
  playTime: number;
  scenarioId: string | null;
  mapId: string;
}

export function getSaveSlots(): SaveSlot[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(SAVE_INDEX_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SaveSlot[];
  } catch {
    return [];
  }
}

function updateSaveIndex(slot: SaveSlot) {
  const slots = getSaveSlots().filter((s) => s.id !== slot.id);
  slots.push(slot);
  slots.sort((a, b) => b.timestamp - a.timestamp);
  localStorage.setItem(SAVE_INDEX_KEY, JSON.stringify(slots));
}

export function saveGame(slotId?: string): string {
  const state = useGameStore.getState();
  const id = slotId || state.id;
  const data = JSON.stringify({
    ...state,
    id,
    updatedAt: Date.now(),
  });
  localStorage.setItem(`${SAVE_KEY_PREFIX}${id}`, data);
  updateSaveIndex({
    id,
    name: state.name,
    timestamp: Date.now(),
    playTime: state.playTime,
    scenarioId: state.scenarioId,
    mapId: state.mapId,
  });
  return id;
}

export function loadGame(slotId: string): boolean {
  if (typeof window === 'undefined') return false;
  const raw = localStorage.getItem(`${SAVE_KEY_PREFIX}${slotId}`);
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    useGameStore.setState(data);
    return true;
  } catch {
    return false;
  }
}

export function deleteSave(slotId: string) {
  localStorage.removeItem(`${SAVE_KEY_PREFIX}${slotId}`);
  const slots = getSaveSlots().filter((s) => s.id !== slotId);
  localStorage.setItem(SAVE_INDEX_KEY, JSON.stringify(slots));
}

export function autoSave() {
  const state = useGameStore.getState();
  if (!state.id) return;
  saveGame(state.id);
}
