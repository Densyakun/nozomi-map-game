import type { ScenarioData } from '@/lib/types';

export const demoScenarios: ScenarioData[] = [
  {
    id: 'scenario-tokyo-start',
    name: '東京ライナー',
    description: '限られた資金で東京近郊に鉄道網を構築し、採算の取れる路線を作り上げろ。',
    difficulty: 'easy',
    mapId: 'tokyo-osm-001',
    mapBounds: { startX: 0, startZ: 0, width: 50, height: 50 },
    startYear: 2026,
    startFunds: 50000000,
    initialFacilities: [
      {
        type: 'station',
        ownerId: 'player',
        stationName: 'セントラル駅',
        position: { x: 0, z: 0 },
      },
    ],
    competitors: [
      {
        id: 'comp-east',
        name: '東海鉄道',
        color: '#ef4444',
        aggression: 0.4,
        initialFacilities: [
          {
            type: 'station',
            ownerId: 'comp-east',
            stationName: '東海駅',
            position: { x: 100, z: -50 },
          },
        ],
      },
    ],
    objectives: [
      {
        id: 'obj-profit',
        type: 'profit',
        description: '月間収益を100万円以上にする',
        target: 1000000,
        current: 0,
        reward: 5000000,
      },
      {
        id: 'obj-passengers',
        type: 'passengers',
        description: '1日あたりの利用者数を5000人以上にする',
        target: 5000,
        current: 0,
        reward: 3000000,
      },
      {
        id: 'obj-coverage',
        type: 'coverage',
        description: '3駅以上を接続する路線網を構築する',
        target: 3,
        current: 0,
        reward: 2000000,
      },
    ],
  },
  {
    id: 'scenario-rural-dev',
    name: '地方開発計画',
    description: '地方都市を鉄道で結び、地域の発展を促進せよ。山岳地帯の工事には注意。',
    difficulty: 'normal',
    mapId: 'tokyo-osm-001',
    mapBounds: { startX: 0, startZ: 0, width: 50, height: 50 },
    startYear: 2026,
    startFunds: 80000000,
    initialFacilities: [],
    competitors: [
      {
        id: 'comp-west',
        name: '西日本急行',
        color: '#3b82f6',
        aggression: 0.3,
        initialFacilities: [
          {
            type: 'station',
            ownerId: 'comp-west',
            stationName: '西口駅',
            position: { x: -80, z: 60 },
          },
          {
            type: 'station',
            ownerId: 'comp-west',
            stationName: '西中央駅',
            position: { x: -40, z: 30 },
          },
        ],
      },
    ],
    objectives: [
      {
        id: 'obj-4stations',
        type: 'coverage',
        description: '4駅以上の路線網を構築する',
        target: 4,
        current: 0,
        reward: 4000000,
      },
      {
        id: 'obj-profit2',
        type: 'profit',
        description: '月間収益を200万円以上にする',
        target: 2000000,
        current: 0,
        reward: 8000000,
      },
    ],
  },
  {
    id: 'scenario-competition',
    name: '競合との戦い',
    description: '強力な競合他社がひしめくエリアで、シェアを獲得せよ。',
    difficulty: 'hard',
    mapId: 'tokyo-osm-001',
    mapBounds: { startX: 0, startZ: 0, width: 50, height: 50 },
    startYear: 2026,
    startFunds: 30000000,
    initialFacilities: [
      {
        type: 'station',
        ownerId: 'player',
        stationName: '新都心駅',
        position: { x: 0, z: 0 },
      },
    ],
    competitors: [
      {
        id: 'comp-a',
        name: '都市高速鉄道',
        color: '#ef4444',
        aggression: 0.6,
        initialFacilities: [
          {
            type: 'station',
            ownerId: 'comp-a',
            stationName: '東ターミナル',
            position: { x: 120, z: -20 },
          },
        ],
      },
      {
        id: 'comp-b',
        name: 'みなと鉄道',
        color: '#10b981',
        aggression: 0.5,
        initialFacilities: [
          {
            type: 'station',
            ownerId: 'comp-b',
            stationName: 'ポート駅',
            position: { x: -60, z: -80 },
          },
        ],
      },
    ],
    objectives: [
      {
        id: 'obj-top-share',
        type: 'passengers',
        description: ' competitorsを超える輸送シェアを獲得する (8000人/日)',
        target: 8000,
        current: 0,
        reward: 10000000,
      },
      {
        id: 'obj-profit3',
        type: 'profit',
        description: '月間収益300万円を達成する',
        target: 3000000,
        current: 0,
        reward: 10000000,
      },
    ],
  },
];

export function getScenarioById(id: string): ScenarioData | undefined {
  return demoScenarios.find((s) => s.id === id);
}
