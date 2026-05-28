import type { MapData, LandUseCell } from '@/lib/types';

export function getElevation(mapData: MapData, x: number, z: number): number {
  const gx = Math.round(x / mapData.gridSize) + Math.floor(mapData.gridWidth / 2);
  const gz = Math.round(z / mapData.gridSize) + Math.floor(mapData.gridHeight / 2);
  if (gx < 0 || gx >= mapData.gridWidth || gz < 0 || gz >= mapData.gridHeight) return 0;
  return mapData.heightMap[gz]?.[gx] ?? 0;
}

export function getLandUse(mapData: MapData, x: number, z: number): LandUseCell | null {
  const gx = Math.round(x / mapData.gridSize) + Math.floor(mapData.gridWidth / 2);
  const gz = Math.round(z / mapData.gridSize) + Math.floor(mapData.gridHeight / 2);
  if (gx < 0 || gx >= mapData.gridWidth || gz < 0 || gz >= mapData.gridHeight) return null;
  return mapData.landUse[gz]?.[gx] ?? null;
}

export function worldToGrid(mapData: MapData, x: number, z: number): { gx: number; gz: number } {
  const gx = Math.round(x / mapData.gridSize) + Math.floor(mapData.gridWidth / 2);
  const gz = Math.round(z / mapData.gridSize) + Math.floor(mapData.gridHeight / 2);
  return { gx, gz };
}

export function gridToWorld(mapData: MapData, gx: number, gz: number): { x: number; z: number } {
  const x = (gx - Math.floor(mapData.gridWidth / 2)) * mapData.gridSize;
  const z = (gz - Math.floor(mapData.gridHeight / 2)) * mapData.gridSize;
  return { x, z };
}

export function calculateLineLength(
  startX: number,
  startZ: number,
  endX: number,
  endZ: number
): number {
  return Math.sqrt((endX - startX) ** 2 + (endZ - startZ) ** 2);
}

export function calculateConstructionCost(
  length: number,
  method: string,
  costMultiplier: number
): number {
  const baseCostPerMeter: Record<string, number> = {
    surface: 10000,
    elevated: 30000,
    tunnel: 80000,
    bridge: 50000,
  };
  const base = baseCostPerMeter[method] ?? 10000;
  return Math.round(length * base * costMultiplier);
}

export function estimateConstructionDays(
  length: number,
  method: string
): number {
  const speedPerDay: Record<string, number> = {
    surface: 50,
    elevated: 30,
    tunnel: 10,
    bridge: 20,
  };
  const speed = speedPerDay[method] ?? 50;
  return Math.max(1, Math.ceil(length / speed));
}
