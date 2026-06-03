/**
 * Overpass APIからOSMデータを取得してマップデータを生成するスクリプト
 * 実行方法: npx tsx scripts/generateOSMMap.ts
 */

import { writeFileSync } from 'fs';
import { fetchOSMByOverpass, classifyOSMFeature, osmFeaturesToMapData } from '../src/lib/osm';
import type { MapData, GeoBounds } from '../src/lib/types';

async function generateOSMMap() {
  const bounds = { lat: 35.7, lon: 139.7, radius: 0.1 }; // 小さなエリア
  const geoBounds: GeoBounds = {
    north: bounds.lat + bounds.radius / 111,
    south: bounds.lat - bounds.radius / 111,
    east: bounds.lon + bounds.radius / (111 * Math.cos((bounds.lat * Math.PI) / 180)),
    west: bounds.lon - bounds.radius / (111 * Math.cos((bounds.lat * Math.PI) / 180)),
  };

  console.log('Fetching OSM data from Overpass API...');
  
  // Fetch highways first with working format (simplified output)
  const highwayQuery = `[out:json][timeout:30];way["highway"](${geoBounds.south.toFixed(6)},${geoBounds.west.toFixed(6)},${geoBounds.north.toFixed(6)},${geoBounds.east.toFixed(6)});(._;>;);out;`;
  console.log('Fetching highways...');
  const highwayData = await fetchOSMByOverpass(highwayQuery);
  const highwayElements = highwayData.elements || [];
  console.log(`Loaded ${highwayElements.length} highway elements`);
  
  // Fetch railways separately with same format
  const railwayQuery = `[out:json][timeout:30];way["railway"](${geoBounds.south.toFixed(6)},${geoBounds.west.toFixed(6)},${geoBounds.north.toFixed(6)},${geoBounds.east.toFixed(6)});(._;>;);out;`;
  console.log('Fetching railways...');
  let railwayElements: any[] = [];
  try {
    const railwayData = await fetchOSMByOverpass(railwayQuery);
    railwayElements = railwayData.elements || [];
    console.log(`Loaded ${railwayElements.length} railway elements`);
  } catch (error) {
    console.log(`Railway fetch failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  const geometries = [...highwayElements, ...railwayElements];
  console.log(`Total loaded ${geometries.length} elements`);
  
  if (geometries.length === 0) {
    console.log('Warning: No elements loaded. Map will be empty.');
  }

  // Build node map for coordinate lookup
  const nodeMap = new Map<number, { lat: number; lon: number }>();
  geometries
    .filter((el: any) => el.type === 'node')
    .forEach((el: any) => {
      nodeMap.set(el.id, { lat: el.lat, lon: el.lon });
    });

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
    .map((geom: any) => {
      // Convert node references to coordinates
      const coordinates: number[][] = [];
      if (geom.nodes && Array.isArray(geom.nodes)) {
        for (const nodeId of geom.nodes) {
          const node = nodeMap.get(nodeId);
          if (node) {
            coordinates.push([node.lon, node.lat]);
          }
        }
      }

      const featureType = classifyOSMFeature(geom.tags || {}) || 'road';
      if (geom.tags?.railway) {
        console.log(`Found railway way: ${geom.id}, type: ${geom.tags.railway}`);
      }

      return {
        id: `osm-${geom.id}`,
        type: featureType,
        geometry: {
          type: 'LineString',
          coordinates,
        },
        properties: geom.tags || {},
        tags: geom.tags || {},
      };
    })
    .filter((feature: any) => feature.geometry.coordinates.length >= 2);

  const railwayCount = osmFeatures.filter((f: any) => f.type === 'railway').length;
  const roadCount = osmFeatures.filter((f: any) => f.type === 'road').length;
  console.log(`Converted ${osmFeatures.length} features (${roadCount} roads, ${railwayCount} railways)`);

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
