import type { MapData } from '@/lib/types';

// デモマップ（JSONファイルからロード）
let demoMap: MapData | null = null;
let tokyoOSMMap: MapData | null = null;

async function loadDemoMap(): Promise<MapData> {
  if (demoMap) return demoMap;
  
  const response = await fetch('/maps/demo-map-001.json');
  if (!response.ok) {
    throw new Error('Failed to load demo map data');
  }
  const data = await response.json();
  demoMap = data as MapData;
  return demoMap;
}

async function loadTokyoOSMMap(): Promise<MapData> {
  if (tokyoOSMMap) return tokyoOSMMap;
  
  const response = await fetch('/maps/tokyo-osm-001.json');
  if (!response.ok) {
    throw new Error('Failed to load Tokyo OSM map data');
  }
  const data = await response.json();
  tokyoOSMMap = data as MapData;
  return tokyoOSMMap;
}

export const demoMaps: MapData[] = [];

export async function getMapByIdAsync(id: string): Promise<MapData | undefined> {
  if (id === 'tokyo-osm-001') {
    if (demoMaps.length === 0) {
      const map = await loadTokyoOSMMap();
      demoMaps.push(map);
    }
  } else if (demoMaps.length === 0) {
    const map = await loadDemoMap();
    demoMaps.push(map);
  }
  return demoMaps.find((m) => m.id === id);
}

export function getMapById(id: string): MapData | undefined {
  return demoMaps.find((m) => m.id === id);
}
