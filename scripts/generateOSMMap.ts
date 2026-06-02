/**
 * Overpass APIからOSMデータを取得してマップデータを生成するスクリプト
 * 実行方法: npx tsx scripts/generateOSMMap.ts
 */

import { writeFileSync } from 'fs';
import { fetchOSMByOverpass, classifyOSMFeature, osmFeaturesToMapData } from '../src/lib/osm';
import type { MapData, GeoBounds } from '../src/lib/types';

async function generateOSMMap() {
  const bounds = { lat: 35.65, lon: 139.7, radius: 0.5 }; // エリアを拡大
  const geoBounds: GeoBounds = {
    north: bounds.lat + bounds.radius / 111,
    south: bounds.lat - bounds.radius / 111,
    east: bounds.lon + bounds.radius / (111 * Math.cos((bounds.lat * Math.PI) / 180)),
    west: bounds.lon - bounds.radius / (111 * Math.cos((bounds.lat * Math.PI) / 180)),
  };

  console.log('Fetching OSM data from Overpass API...');
  const query = `[out:json][timeout:60];way["highway"](${geoBounds.south.toFixed(6)},${geoBounds.west.toFixed(6)},${geoBounds.north.toFixed(6)},${geoBounds.east.toFixed(6)});node["name"](${geoBounds.south.toFixed(6)},${geoBounds.west.toFixed(6)},${geoBounds.north.toFixed(6)},${geoBounds.east.toFixed(6)});out body;>;out skel qt;`;
  
  const data = await fetchOSMByOverpass(query);
  const geometries = data.elements || [];
  console.log(`Loaded ${geometries.length} elements`);

  // Extract place names from nodes
  const places = geometries
    .filter((el: any) => el.type === 'node' && el.tags && el.tags.name)
    .map((el: any) => ({
      id: `place-${el.id}`,
      name: el.tags.name,
      position: { lat: el.lat, lon: el.lon },
      type: el.tags.place || el.tags.amenity || 'unknown',
    }));

  console.log(`Found ${places.length} places`);

  // Convert geometries to OSM features (only ways)
  const osmFeatures = geometries
    .filter((geom: any) => geom.type === 'way')
    .map((geom: any) => ({
      id: `osm-${geom.id}`,
      type: classifyOSMFeature(geom.tags || {}) || 'road',
      geometry: geom,
      properties: geom.tags || {},
      tags: geom.tags || {},
    }));

  console.log(`Converted ${osmFeatures.length} features`);

  // Generate map data from OSM features
  console.log('Generating map data...');
  const mapData = osmFeaturesToMapData(osmFeatures, geoBounds, 'tokyo-osm-001', '東京周辺 (OSM)');
  
  // Add places to map data
  (mapData as any).places = places;

  // Save to JSON file
  const outputPath = './public/maps/tokyo-osm-001.json';
  writeFileSync(outputPath, JSON.stringify(mapData, null, 2));
  console.log(`Map data saved to ${outputPath}`);

  return mapData;
}

generateOSMMap().catch(console.error);
