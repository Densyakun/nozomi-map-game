import type { MapData } from '@/lib/types';
import { generateDemoMapData } from '@/lib/demoMapData';
import { osmFeaturesToMapData } from '@/lib/osm';

// デモマップ（手続き的生成）
const demoMap = generateDemoMapData();

// OSMベースのマップ（東京周辺）
const tokyoOSMMap: MapData = {
  id: 'tokyo-osm-001',
  name: '東京周辺 (OSM)',
  description: 'OpenStreetMapデータを使用した東京周辺マップ',
  bounds: {
    north: 35.7,
    south: 35.6,
    east: 139.8,
    west: 139.6,
  },
  center: { lat: 35.65, lng: 139.7 },
  gridSize: 50,
  gridWidth: 100,
  gridHeight: 100,
  heightMap: [],
  landUse: [],
  population: [],
};

export const demoMaps: MapData[] = [
  demoMap,
  tokyoOSMMap,
];

export function getMapById(id: string): MapData | undefined {
  return demoMaps.find((m) => m.id === id);
}

// OSMデータからマップをロードする関数
export async function loadOSMMap(
  bounds: { lat: number; lon: number; radius: number },
  mapId: string = 'osm-custom-001'
): Promise<MapData> {
  const { lat, lon, radius } = bounds;
  const geoBounds = {
    north: lat + radius / 111,
    south: lat - radius / 111,
    east: lon + radius / (111 * Math.cos((lat * Math.PI) / 180)),
    west: lon - radius / (111 * Math.cos((lat * Math.PI) / 180)),
  };

  // Overpass API クエリを構築
  const query = `
    (
      way["highway"](${geoBounds.south},${geoBounds.west},${geoBounds.north},${geoBounds.east});
      way["railway"](${geoBounds.south},${geoBounds.west},${geoBounds.north},${geoBounds.east});
      way["waterway"~"river|stream"](${geoBounds.south},${geoBounds.west},${geoBounds.north},${geoBounds.east});
      relation["waterway"~"river"](${geoBounds.south},${geoBounds.west},${geoBounds.north},${geoBounds.east});
    );
  `;

  try {
    const { fetchOSMByOverpass, classifyOSMFeature } = await import('@/lib/osm');
    const geometries = await fetchOSMByOverpass(query);
    
    // OSMデータをOSMFeature形式に変換
    const osmFeatures = geometries.map((geom: any) => ({
      id: `osm-${geom.id}`,
      type: classifyOSMFeature(geom.tags || {}) || 'road',
      geometry: geom,
      properties: geom.tags || {},
      tags: geom.tags || {},
    }));

    return osmFeaturesToMapData(osmFeatures, geoBounds, mapId, `OSM Map (${lat.toFixed(4)}, ${lon.toFixed(4)})`);
  } catch (error) {
    console.error('Failed to load OSM map:', error);
    // フォールバックとしてデモマップを返す
    return demoMap;
  }
}
