import type { MapData, LandUseCell, PopulationCell } from '@/lib/types';

function generateHeightMap(width: number, height: number): number[][] {
  const map: number[][] = [];
  for (let z = 0; z < height; z++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      const cx = x - width / 2;
      const cz = z - height / 2;
      const h =
        Math.sin(x * 0.15) * Math.cos(z * 0.12) * 4 +
        Math.sin((x + z) * 0.08) * 3 +
        Math.cos(x * 0.2 + z * 0.18) * 2 +
        Math.max(0, 8 - Math.sqrt(cx * cx + cz * cz) * 0.12) +
        (Math.random() - 0.5) * 0.5;
      row.push(Math.max(0, h));
    }
    map.push(row);
  }
  return map;
}

function generateLandUse(width: number, height: number, heightMap: number[][]): LandUseCell[][] {
  const grid: LandUseCell[][] = [];
  const centerX = width / 2;
  const centerZ = height / 2;
  for (let z = 0; z < height; z++) {
    const row: LandUseCell[] = [];
    for (let x = 0; x < width; x++) {
      const cx = x - centerX, cz = z - centerZ;
      const dist = Math.sqrt(cx * cx + cz * cz);
      const h = heightMap[z][x];

      if (h > 12) {
        row.push({ type: 'mountain', costMultiplier: 3.0, allowedMethods: ['tunnel', 'bridge'] });
      } else if (h > 8) {
        row.push({ type: 'forest', costMultiplier: 1.8, allowedMethods: ['surface', 'elevated', 'tunnel', 'bridge'] });
      } else if (dist < 5) {
        row.push({ type: 'urban', costMultiplier: 4.0, allowedMethods: ['tunnel', 'elevated'] });
      } else if (dist < 10) {
        row.push({ type: 'suburban', costMultiplier: 2.5, allowedMethods: ['surface', 'elevated', 'tunnel'] });
      } else if (dist < 14) {
        row.push({ type: 'rural', costMultiplier: 1.5, allowedMethods: ['surface', 'elevated', 'tunnel', 'bridge'] });
      } else if (dist < 18) {
        row.push({ type: 'agriculture', costMultiplier: 1.2, allowedMethods: ['surface', 'elevated', 'bridge'] });
      } else {
        row.push({ type: 'forest', costMultiplier: 1.8, allowedMethods: ['surface', 'elevated', 'tunnel', 'bridge'] });
      }

      const isRiver = Math.abs(x - width * 0.3) < 1.5 || (Math.abs(x - width * 0.3) < 3 && z > height * 0.4 && z < height * 0.6);
      if (isRiver && row[row.length - 1].type !== 'urban') {
        row[row.length - 1] = { type: 'river', costMultiplier: 5.0, allowedMethods: ['bridge', 'tunnel'] };
      }

      if (cx > 8 && cx < 14 && cz > 6 && cz < 12) {
        row[row.length - 1] = { type: 'water', costMultiplier: 5.0, allowedMethods: ['bridge', 'tunnel'] };
      }
    }
    grid.push(row);
  }
  return grid;
}

function generatePopulation(width: number, height: number, landUse: LandUseCell[][]): PopulationCell[][] {
  return Array.from({ length: height }, (_, z) =>
    Array.from({ length: width }, (_, x) => {
      const lu = landUse[z]?.[x];
      switch (lu?.type) {
        case 'urban': return { daytime: 500, nighttime: 200, commercial: 300, residential: 200, industrial: 50 };
        case 'suburban': return { daytime: 150, nighttime: 300, commercial: 50, residential: 250, industrial: 20 };
        case 'rural': return { daytime: 40, nighttime: 60, commercial: 10, residential: 50, industrial: 10 };
        case 'agriculture': return { daytime: 20, nighttime: 10, commercial: 5, residential: 10, industrial: 5 };
        default: return { daytime: 5, nighttime: 5, commercial: 0, residential: 5, industrial: 0 };
      }
    })
  );
}

export function generateDemoMapData(): MapData {
  const gridWidth = 100;
  const gridHeight = 100;
  const gridSize = 20;

  const heightMap = generateHeightMap(gridWidth, gridHeight);
  const landUse = generateLandUse(gridWidth, gridHeight, heightMap);
  const population = generatePopulation(gridWidth, gridHeight, landUse);

  return {
    id: 'demo-map-001',
    name: 'デモマップ',
    description: '鉄道建設ゲーム用のデモマップ。中央に都市、川と湖があります。',
    bounds: {
      north: gridHeight * gridSize / 2,
      south: -gridHeight * gridSize / 2,
      east: gridWidth * gridSize / 2,
      west: -gridWidth * gridSize / 2,
    },
    center: { lat: 35.6762, lng: 139.6503 },
    gridSize,
    gridWidth,
    gridHeight,
    heightMap,
    landUse,
    population,
  };
}
