import { useGameStore } from '@/store/gameStore';
import type { RailwayNetwork, Station, RailLine } from '@/lib/types';

export function runCompetitorAI() {
  const state = useGameStore.getState();
  const competitors = new Set<string>();
  for (const s of state.railwayNetwork.stations) {
    if (s.ownerId !== 'player') competitors.add(s.ownerId);
  }
  for (const l of state.railwayNetwork.lines) {
    if (l.ownerId !== 'player') competitors.add(l.ownerId);
  }

  for (const compId of competitors) {
    const compStations = state.railwayNetwork.stations.filter((s) => s.ownerId === compId);
    const compLines = state.railwayNetwork.lines.filter((l) => l.ownerId === compId);
    const aggression = 0.5;

    if (Math.random() < aggression * 0.1) {
      expandCompetitor(compId, compStations, compLines);
    }
  }
}

function expandCompetitor(
  compId: string,
  stations: Station[],
  lines: RailLine[]
) {
  if (stations.length === 0) {
    const state = useGameStore.getState();
    const mapW = 50;
    const mapH = 50;
    const gridSize = 10;

    const x = (Math.floor(Math.random() * mapW) - Math.floor(mapW / 2)) * gridSize;
    const z = (Math.floor(Math.random() * mapH) - Math.floor(mapH / 2)) * gridSize;

    const { v4: uuid } = require('uuid');
    const newStation: Station = {
      id: uuid(),
      ownerId: compId,
      name: `${compId}駅`,
      position: { x, z },
      elevation: 0,
      type: 'normal',
      passengers: 0,
      lineIds: [],
      facilityIds: [],
    };

    useGameStore.getState().addStation(newStation);
    return;
  }

  const state = useGameStore.getState();
  const playerStations = state.railwayNetwork.stations.filter((s) => s.ownerId === 'player');
  if (playerStations.length === 0) return;

  const target = playerStations[Math.floor(Math.random() * playerStations.length)];
  const nearest = stations.reduce((best, s) => {
    const dist = Math.sqrt(
      (s.position.x - target.position.x) ** 2 +
        (s.position.z - target.position.z) ** 2
    );
    return dist < best.dist ? { station: s, dist } : best;
  }, { station: stations[0], dist: Infinity });

  if (nearest.station && nearest.dist > 30) {
    const { v4: uuid } = require('uuid');
    const newStation: Station = {
      id: uuid(),
      ownerId: compId,
      name: `${compId} ${stations.length + 1}号駅`,
      position: {
        x: (nearest.station.position.x + target.position.x) / 2,
        z: (nearest.station.position.z + target.position.z) / 2,
      },
      elevation: 0,
      type: 'normal',
      passengers: 0,
      lineIds: [],
      facilityIds: [],
    };

    useGameStore.getState().addStation(newStation);

    const newLine: RailLine = {
      id: uuid(),
      ownerId: compId,
      name: `${compId}線`,
      color: `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`,
      stationIds: [nearest.station.id, newStation.id],
      segments: [
        {
          startStationId: nearest.station.id,
          endStationId: newStation.id,
          length: nearest.dist,
          constructionCost: Math.round(nearest.dist * 10000),
          constructionMethod: 'surface',
          completed: true,
          underConstruction: true,
          remainingDays: Math.max(1, Math.round(nearest.dist / 50)),
        },
      ],
      timetable: [],
      trainIds: [],
    };

    useGameStore.getState().addLine(newLine);
  }
}
