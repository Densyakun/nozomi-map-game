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
  OSMBuilding,
} from '@/lib/types';

const OSM_API = 'https://www.openstreetmap.org/api/0.6';
const OVERPASS_API = 'https://overpass-api.de/api/interpreter';
const OVERPASS_API_ALT = 'https://overpass.kumi.systems/api/interpreter';
const OVERPASS_API_Z = 'https://z.overpass-api.de/api/interpreter';

export async function fetchOSMByBounds(
  bounds: GeoBounds
): Promise<OSMRawData> {
  const url = `${OSM_API}/map?bbox=${bounds.west},${bounds.south},${bounds.east},${bounds.north}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSM API error: ${res.status}`);
  const text = await res.text();
  return parseOSMXML(text);
}

export async function fetchOSMByOverpass(query: string, maxRetries = 3): Promise<any> {
  const axios = (await import('axios')).default;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries} using overpass.kumi.systems with axios...`);
      const response = await axios.post(OVERPASS_API_ALT, `data=${encodeURIComponent(query)}`, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        timeout: 90000,
      });
      
      console.log(`Success on attempt ${attempt}`);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        console.log(`Attempt ${attempt} failed: ${error.response.status} ${error.response.statusText}`);
      } else if (error.code === 'ECONNABORTED') {
        console.log(`Attempt ${attempt} timed out after 90 seconds`);
      } else {
        console.log(`Attempt ${attempt} failed: ${error.message}`);
      }
      
      if (attempt === maxRetries) {
        throw new Error(`Failed after ${maxRetries} attempts. Last error: ${error.message}`);
      }
      
      console.log(`Retrying in 3 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  throw new Error('Max retries exceeded');
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
  if (tags.highway || tags.road) return 'road';
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

  // Add some terrain variation using simple noise
  for (let z = 0; z < gridHeight; z++) {
    for (let x = 0; x < gridWidth; x++) {
      const nx = x / gridWidth;
      const nz = z / gridHeight;
      heightMap[z][x] = 
        Math.sin(nx * 6.28) * Math.cos(nz * 6.28) * 5 +
        Math.sin(nx * 12.56) * Math.sin(nz * 12.56) * 2;
    }
  }
  const landUse: LandUseCell[][] = Array.from({ length: gridHeight }, () =>
    Array.from({ length: gridWidth }, () => ({
      type: 'rural' as const,
      costMultiplier: 1.5,
      allowedMethods: ['surface', 'elevated', 'tunnel', 'bridge'] as const,
    }))
  );

  // Extract buildings from OSM features
  const osmBuildings: OSMBuilding[] = [];
  
  for (const feat of features) {
    const coords = flattenCoordinates(feat.geometry.coordinates);
    
    // Extract building data
    if (feat.type === 'building') {
      const c = getCoordCenter(feat.geometry.coordinates);
      const buildingLevels = feat.tags?.['building:levels'] 
        ? Number(feat.tags['building:levels']) 
        : undefined;
      const buildingHeight = buildingLevels 
        ? buildingLevels * 3 
        : feat.tags?.height 
          ? Number(feat.tags.height) 
          : 5 + Math.random() * 10;
      
      let buildingType: OSMBuilding['buildingType'] = 'other';
      if (feat.tags?.building === 'residential' || feat.tags?.building === 'house' || feat.tags?.building === 'apartments') {
        buildingType = 'residential';
      } else if (feat.tags?.building === 'commercial' || feat.tags?.building === 'office' || feat.tags?.building === 'retail') {
        buildingType = 'commercial';
      } else if (feat.tags?.building === 'industrial') {
        buildingType = 'industrial';
      } else if (feat.tags?.building === 'public' || feat.tags?.amenity) {
        buildingType = 'public';
      }
      
      osmBuildings.push({
        id: `bldg-${feat.id}`,
        position: {
          x: lonToX(c[0], centerLon, gridSize),
          z: latToZ(c[1], centerLat, gridSize),
        },
        height: buildingHeight,
        levels: buildingLevels,
        buildingType,
        footprint: coords as number[][],
        name: feat.tags?.name,
      });
    }
    
    // Update land use grid
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
      } else if (lu === 'agriculture') {
        population[z][x] = { daytime: 20, nighttime: 10, commercial: 5, residential: 10, industrial: 5 };
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
    osmBuildings,
    landmarks,
  };
}

function flattenCoordinates(coords: any): number[][] {
  if (!coords || coords.length === 0) return [];
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
