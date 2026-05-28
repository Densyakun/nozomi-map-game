import type {
  RailwayNetwork,
  MapData,
  PassengerDemand,
  Station,
  SimulationResult,
} from '@/lib/types';

export function runSimulation(
  network: RailwayNetwork,
  mapData: MapData
): SimulationResult {
  const playerStations = network.stations.filter((s) => s.ownerId === 'player');
  const competitorStations = network.stations.filter((s) => s.ownerId !== 'player');

  const demand = calculatePassengerDemand(playerStations, competitorStations, mapData);
  const stationPassengers = distributePassengers(demand, network);
  const linePassengers = calculateLinePassengers(network, stationPassengers);

  const revenue = calculateRevenue(stationPassengers, network);
  const expenses = calculateExpenses(network);

  return { stationPassengers, linePassengers, revenue, expenses, demand };
}

function calculatePassengerDemand(
  playerStations: Station[],
  competitorStations: Station[],
  mapData: MapData
): PassengerDemand[] {
  const demand: PassengerDemand[] = [];
  const allStations = [...playerStations, ...competitorStations];

  for (let i = 0; i < allStations.length; i++) {
    for (let j = 0; j < allStations.length; j++) {
      if (i === j) continue;
      const origin = allStations[i];
      const dest = allStations[j];
      const dist = Math.sqrt(
        (dest.position.x - origin.position.x) ** 2 +
          (dest.position.z - origin.position.z) ** 2
      );

      const gx = Math.round(origin.position.x / mapData.gridSize) + Math.floor(mapData.gridWidth / 2);
      const gz = Math.round(origin.position.z / mapData.gridSize) + Math.floor(mapData.gridHeight / 2);
      const pop = mapData.population[gz]?.[gx];
      const popFactor = pop ? (pop.daytime + pop.nighttime) / 2 : 100;

      const dailyPassengers = Math.max(0, Math.round(popFactor * 0.1 * Math.exp(-dist * 0.005)));

      if (dailyPassengers > 0) {
        demand.push({
          originStationId: origin.id,
          destinationStationId: dest.id,
          dailyPassengers,
        });
      }
    }
  }

  return demand;
}

function distributePassengers(
  demand: PassengerDemand[],
  network: RailwayNetwork
): Record<string, number> {
  const stationPassengers: Record<string, number> = {};
  for (const station of network.stations) {
    stationPassengers[station.id] = 0;
  }

  for (const d of demand) {
    const origin = network.stations.find((s) => s.id === d.originStationId);
    if (!origin || origin.ownerId !== 'player') continue;

    const connected = canReachStation(network, d.originStationId, d.destinationStationId);
    if (connected) {
      stationPassengers[d.originStationId] =
        (stationPassengers[d.originStationId] || 0) + d.dailyPassengers * 0.5;
      stationPassengers[d.destinationStationId] =
        (stationPassengers[d.destinationStationId] || 0) + d.dailyPassengers * 0.5;
    }
  }

  return stationPassengers;
}

function canReachStation(
  network: RailwayNetwork,
  fromStationId: string,
  toStationId: string
): boolean {
  const visited = new Set<string>();
  const queue = [fromStationId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === toStationId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    for (const line of network.lines) {
      if (!line.segments.some((s) => s.completed)) continue;
      const idx = line.stationIds.indexOf(current);
      if (idx >= 0) {
        if (idx > 0) queue.push(line.stationIds[idx - 1]);
        if (idx < line.stationIds.length - 1) queue.push(line.stationIds[idx + 1]);
      }
    }
  }

  return false;
}

function calculateLinePassengers(
  network: RailwayNetwork,
  stationPassengers: Record<string, number>
): Record<string, number> {
  const linePassengers: Record<string, number> = {};
  for (const line of network.lines) {
    linePassengers[line.id] = 0;
    for (const sid of line.stationIds) {
      linePassengers[line.id] += stationPassengers[sid] || 0;
    }
  }
  return linePassengers;
}

function calculateRevenue(
  stationPassengers: Record<string, number>,
  network: RailwayNetwork
): number {
  let revenue = 0;
  for (const station of network.stations) {
    if (station.ownerId === 'player') {
      revenue += (stationPassengers[station.id] || 0) * 200;
    }
  }
  return revenue;
}

function calculateExpenses(network: RailwayNetwork): number {
  let expenses = 0;
  for (const line of network.lines) {
    if (line.ownerId !== 'player') continue;
    for (const seg of line.segments) {
      if (seg.completed) {
        expenses += seg.length * 100;
      }
    }
  }
  for (const station of network.stations) {
    if (station.ownerId === 'player') {
      expenses += 50000;
    }
  }
  return expenses;
}
