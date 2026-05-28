import type {
  OSMRawData,
  OSMNode,
  OSMWay,
  OSMRelation,
  OSMFeature,
  OSMFeatureType,
  GeoJSONGeometry,
  GeoBounds,
  MapData,
  LandUseCell,
  PopulationCell,
} from '@/lib/types';

const OSM_API = 'https://www.openstreetmap.org/api/0.6';
const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

export async function fetchOSMByBounds(
  bounds: GeoBounds
): Promise<OSMRawData> {
  const url = `${OSM_API}/map?bbox=${bounds.west},${bounds.south},${bounds.east},${bounds.north}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSM API error: ${res.status}`);
  const text = await res.text();
  return parseOSMXML(text);
}

export async function fetchOSMByOverpass(query: string): Promise<GeoJSONGeometry[]> {
  const res = await fetch(OVERPASS_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(`[out:json];${query};out geom;`)}`,
  });
  if (!res.ok) throw new Error(`Overpass API error: ${res.status}`);
  const data = await res.json();
  return data.elements || [];
}

export function parseOSMXML(xml: string): OSMRawData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const elements: (OSMNode | OSMWay | OSMRelation)[] = [];

  const nodes = doc.querySelectorAll('node');
  nodes.forEach((node) => {
    elements.push({
      id: Number(node.getAttribute('id')),
      lat: Number(node.getAttribute('lat')),
      lon: Number(node.getAttribute('lon')),
      tags: parseTags(node),
    });
  });

  const ways = doc.querySelectorAll('way');
  ways.forEach((way) => {
    const nds: number[] = [];
    way.querySelectorAll('nd').forEach((nd) => nds.push(Number(nd.getAttribute('ref'))));
    elements.push({
      id: Number(way.getAttribute('id')),
      nodes: nds,
      tags: parseTags(way),
    });
  });

  const relations = doc.querySelectorAll('relation');
  relations.forEach((rel) => {
    const members: { type: 'node' | 'way' | 'relation'; ref: number; role: string }[] = [];
    rel.querySelectorAll('member').forEach((m) => {
      members.push({
        type: m.getAttribute('type') as 'node' | 'way' | 'relation',
        ref: Number(m.getAttribute('ref')),
        role: m.getAttribute('role') || '',
      });
    });
    elements.push({
      id: Number(rel.getAttribute('id')),
      members,
      tags: parseTags(rel),
    });
  });

  return { elements };
}

function parseTags(el: Element): Record<string, string> | undefined {
  const tags: Record<string, string> = {};
  el.querySelectorAll('tag').forEach((tag) => {
    const k = tag.getAttribute('k');
    const v = tag.getAttribute('v');
    if (k && v) tags[k] = v;
  });
  return Object.keys(tags).length > 0 ? tags : undefined;
}

export function classifyOSMFeature(tags: Record<string, string>): OSMFeatureType | null {
  if (tags.building || tags['building:part']) return 'building';
  if (tags.waterway === 'river' || tags.waterway === 'stream' || tags.waterway === 'canal') return 'river';
  if (tags.natural === 'water' || tags.landuse === 'reservoir' || tags.landuse === 'basin') return 'water';
  if (tags.highway || tags.road) return tags.highway === 'motorway' || tags.highway === 'primary' || tags.highway === 'secondary' ? 'road' : null;
  if (tags.railway && tags.railway !== 'abandoned') return 'railway';
  if (tags.natural === 'wood' || tags.landuse === 'forest') return 'forest';
  if (tags.leisure === 'park' || tags.leisure === 'garden') return 'park';
  if (tags.landuse === 'farmland' || tags.landuse === 'farmyard') return 'agriculture';
  if (tags.landuse === 'industrial') return 'industrial';
  if (tags.landuse === 'residential') return 'residential';
  if (tags.landuse === 'commercial' || tags.landuse === 'retail') return 'commercial';
  return null;
}

function lonToX(lon: number, centerLon: number, gridSize: number): number {
  const mPerDeg = 111320;
  const metersPerLon = mPerDeg * Math.cos((centerLon * Math.PI) / 180);
  return (lon - centerLon) * metersPerLon;
}

function latToZ(lat: number, centerLat: number, gridSize: number): number {
  const mPerDeg = 111320;
  return (centerLat - lat) * mPerDeg;
}

export function osmFeaturesToMapData(
  features: OSMFeature[],
  bounds: GeoBounds,
  id: string = 'osm-map-001',
  name: string = 'OSM Map',
  gridSize: number = 50
): MapData {
  const centerLat = (bounds.north + bounds.south) / 2;
  const centerLon = (bounds.east + bounds.west) / 2;

  const mPerDeg = 111320;
  const mPerLon = mPerDeg * Math.cos((centerLat * Math.PI) / 180);
  const widthM = (bounds.east - bounds.west) * mPerLon;
  const heightM = (bounds.north - bounds.south) * mPerDeg;

  const gridWidth = Math.ceil(widthM / gridSize);
  const gridHeight = Math.ceil(heightM / gridSize);

  const heightMap: number[][] = Array.from({ length: gridHeight }, () =>
    Array(gridWidth).fill(0)
  );
  const landUse: LandUseCell[][] = Array.from({ length: gridHeight }, () =>
    Array.from({ length: gridWidth }, () => ({
      type: 'rural' as const,
      costMultiplier: 1.5,
      allowedMethods: ['surface', 'elevated', 'tunnel', 'bridge'] as const,
    }))
  );

  for (const feat of features) {
    const coords = flattenCoordinates(feat.geometry.coordinates);
    for (const c of coords) {
      const x = Math.round((c[0] - bounds.west) / (bounds.east - bounds.west) * gridWidth);
      const z = Math.round((c[1] - bounds.south) / (bounds.north - bounds.south) * gridHeight);
      if (x < 0 || x >= gridWidth || z < 0 || z >= gridHeight) continue;

      const luType = osmTypeToLandUse(feat.type);
      if (luType) {
        landUse[z][x] = getLandUseCell(luType);
      }
    }
  }

  const population: PopulationCell[][] = Array.from({ length: gridHeight }, () =>
    Array.from({ length: gridWidth }, () => ({
      daytime: 10, nighttime: 10, commercial: 0, residential: 5, industrial: 0,
    }))
  );

  for (let z = 0; z < gridHeight; z++) {
    for (let x = 0; x < gridWidth; x++) {
      const lu = landUse[z][x].type;
      if (lu === 'urban') {
        population[z][x] = { daytime: 500, nighttime: 200, commercial: 300, residential: 200, industrial: 50 };
      } else if (lu === 'suburban') {
        population[z][x] = { daytime: 150, nighttime: 300, commercial: 50, residential: 250, industrial: 20 };
      } else if (lu === 'industrial') {
        population[z][x] = { daytime: 300, nighttime: 50, commercial: 10, residential: 20, industrial: 200 };
      }
    }
  }

  const landmarks = features
    .filter((f) => f.type === 'railway' && f.properties.name)
    .map((f, i) => {
      const c = getCoordCenter(f.geometry.coordinates);
      return {
        id: `lm-osm-${i}`,
        name: String(f.properties.name || ''),
        position: {
          x: lonToX(c[0], centerLon, gridSize),
          z: latToZ(c[1], centerLat, gridSize),
        },
        type: 'station' as const,
      };
    });

  return {
    id,
    name,
    description: `OSM map: ${bounds.north.toFixed(4)}, ${bounds.south.toFixed(4)}, ${bounds.east.toFixed(4)}, ${bounds.west.toFixed(4)}`,
    bounds,
    center: { lat: centerLat, lng: centerLon },
    gridSize,
    gridWidth,
    gridHeight,
    heightMap,
    landUse,
    population,
    osmFeatures: features,
  };
}

function flattenCoordinates(coords: any): number[][] {
  if (typeof coords[0] === 'number') return [coords as number[]];
  if (typeof coords[0]?.[0] === 'number') return coords as number[][];
  return coords.flatMap((c: any) => flattenCoordinates(c));
}

function getCoordCenter(coords: any): [number, number] {
  const flat = flattenCoordinates(coords);
  if (flat.length === 0) return [0, 0];
  const sum = flat.reduce(
    (acc: [number, number], c: number[]) => [acc[0] + c[0], acc[1] + c[1]] as [number, number],
    [0, 0]
  );
  return [sum[0] / flat.length, sum[1] / flat.length];
}

function osmTypeToLandUse(type: OSMFeatureType): LandUseCell['type'] | null {
  switch (type) {
    case 'building': case 'commercial': return 'urban';
    case 'residential': return 'suburban';
    case 'river': case 'water': return 'water';
    case 'forest': return 'forest';
    case 'park': return 'park';
    case 'agriculture': return 'agriculture';
    case 'industrial': return 'industrial';
    default: return null;
  }
}

function getLandUseCell(type: LandUseCell['type']): LandUseCell {
  const map: Record<LandUseCell['type'], LandUseCell> = {
    urban: { type: 'urban', costMultiplier: 4.0, allowedMethods: ['tunnel', 'elevated'] },
    suburban: { type: 'suburban', costMultiplier: 2.5, allowedMethods: ['surface', 'elevated', 'tunnel'] },
    rural: { type: 'rural', costMultiplier: 1.5, allowedMethods: ['surface', 'elevated', 'tunnel', 'bridge'] },
    forest: { type: 'forest', costMultiplier: 1.8, allowedMethods: ['surface', 'elevated', 'tunnel', 'bridge'] },
    mountain: { type: 'mountain', costMultiplier: 3.0, allowedMethods: ['tunnel'] },
    water: { type: 'water', costMultiplier: 5.0, allowedMethods: ['bridge', 'tunnel'] },
    river: { type: 'river', costMultiplier: 5.0, allowedMethods: ['bridge', 'tunnel'] },
    agriculture: { type: 'agriculture', costMultiplier: 1.2, allowedMethods: ['surface', 'elevated', 'bridge'] },
    industrial: { type: 'industrial', costMultiplier: 2.0, allowedMethods: ['surface', 'elevated', 'tunnel'] },
    park: { type: 'park', costMultiplier: 3.0, allowedMethods: ['tunnel'] },
  };
  return map[type] || map.rural;
}
