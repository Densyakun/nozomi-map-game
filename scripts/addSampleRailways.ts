/**
 * サンプルの線路データをマップに追加するスクリプト
 */

import { readFileSync, writeFileSync } from 'fs';
import type { MapData } from '../src/lib/types';

function addSampleRailways() {
  const mapPath = './public/maps/tokyo-osm-001.json';
  const mapData: MapData = JSON.parse(readFileSync(mapPath, 'utf-8'));

  // サンプルの線路フィーチャを作成
  const sampleRailways = [
    {
      id: 'osm-railway-sample-1',
      type: 'railway' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [139.69, 35.685],
          [139.695, 35.688],
          [139.7, 35.69],
          [139.705, 35.692],
        ],
      },
      properties: {
        railway: 'rail',
      },
      tags: {
        railway: 'rail',
      },
    },
    {
      id: 'osm-railway-sample-2',
      type: 'railway' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [139.688, 35.692],
          [139.692, 35.69],
          [139.696, 35.688],
          [139.7, 35.686],
        ],
      },
      properties: {
        railway: 'rail',
      },
      tags: {
        railway: 'rail',
      },
    },
  ];

  // 既存のosmFeaturesに追加、または新規作成
  if (!mapData.osmFeatures) {
    mapData.osmFeatures = [];
  }
  mapData.osmFeatures = [...mapData.osmFeatures, ...sampleRailways];

  // マップを保存
  writeFileSync(mapPath, JSON.stringify(mapData, null, 2));
  console.log(`Added ${sampleRailways.length} sample railway features to ${mapPath}`);
  console.log(`Total osmFeatures: ${mapData.osmFeatures.length}`);
}

addSampleRailways();
