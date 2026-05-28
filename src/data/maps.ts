import type { MapData } from '@/lib/types';

export const demoMaps: MapData[] = [];

export function getMapById(id: string): MapData | undefined {
  return demoMaps.find((m) => m.id === id);
}
