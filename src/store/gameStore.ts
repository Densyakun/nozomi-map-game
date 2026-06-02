import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';
import type { GameState, GameTime, RailwayNetwork, FinanceData, Evaluation, ObjectiveProgress } from '@/lib/types';

const initialTime: GameTime = { year: 2026, month: 4, day: 1, hour: 6, minute: 0 };

const initialRailwayNetwork: RailwayNetwork = {
  stations: [],
  lines: [],
  trains: [],
  facilities: [],
};

const initialFinance: FinanceData = {
  funds: 10000000,
  history: [],
};

const initialEvaluation: Evaluation = {
  overall: 'C',
  profitability: 'C',
  transportVolume: 'C',
  networkCoverage: 'C',
  financialHealth: 'C',
  punctuality: 'C',
};

interface GameActions {
  initNewGame: (name: string, mapId: string, scenarioId?: string) => void;
  initScenarioGame: (name: string, mapId: string, scenarioId: string, funds: number, objectives: ObjectiveProgress[], initialFacilities?: any[], competitors?: any[]) => void;
  setTime: (time: GameTime) => void;
  setSpeed: (speed: 0 | 1 | 2 | 5 | 10) => void;
  setPaused: (paused: boolean) => void;
  addFunds: (amount: number, type: FinanceData['history'][0]['type'], description: string) => void;
  spendFunds: (amount: number, type: FinanceData['history'][0]['type'], description: string) => boolean;
  updateEvaluation: (evaluation: Evaluation) => void;
  updateObjective: (objectiveId: string, current: number) => void;
  addStation: (station: RailwayNetwork['stations'][0]) => void;
  removeStation: (stationId: string) => void;
  addLine: (line: RailwayNetwork['lines'][0]) => void;
  removeLine: (lineId: string) => void;
  updateLineSegment: (lineId: string, segmentIndex: number, updates: Partial<RailwayNetwork['lines'][0]['segments'][0]>) => void;
  addTrain: (train: RailwayNetwork['trains'][0]) => void;
  removeTrain: (trainId: string) => void;
  updatePlayTime: (delta: number) => void;
  reset: () => void;
}

const defaultState: GameState = {
  id: '',
  name: '',
  createdAt: 0,
  updatedAt: 0,
  playTime: 0,
  scenarioId: null,
  time: { ...initialTime },
  speed: 1,
  paused: false,
  mapId: '',
  railwayNetwork: { ...initialRailwayNetwork },
  finance: { ...initialFinance },
  objectives: [],
  evaluation: { ...initialEvaluation },
  competitors: [],
};

export const useGameStore = create<GameState & GameActions>()(
  persist(
    (set, get) => ({
      ...defaultState,

      initNewGame: (name, mapId, scenarioId?) => {
        set({
          id: uuid(),
          name,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          playTime: 0,
          scenarioId: scenarioId ?? null,
          time: { ...initialTime },
          speed: 1,
          paused: false,
          mapId,
          railwayNetwork: { ...initialRailwayNetwork },
          finance: { ...initialFinance },
          objectives: [],
          evaluation: { ...initialEvaluation },
        });
      },

      initScenarioGame: (name, mapId, scenarioId, funds, objectives, initialFacilities = [], competitors = []) => {
        // Process initial facilities
        const stations = initialFacilities.filter(f => f.type === 'station').map((f: any) => ({
          id: uuid(),
          ownerId: f.ownerId,
          name: f.stationName,
          position: f.position,
          elevation: 0,
          type: 'normal' as const,
          passengers: 0,
          lineIds: [],
          facilityIds: [],
        }));

        set({
          id: uuid(),
          name,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          playTime: 0,
          scenarioId,
          time: { ...initialTime },
          speed: 1,
          paused: false,
          mapId,
          railwayNetwork: { ...initialRailwayNetwork, stations },
          finance: { funds, history: [] },
          objectives,
          evaluation: { ...initialEvaluation },
          competitors,
        });
      },

      setTime: (time) => set({ time, updatedAt: Date.now() }),
      setSpeed: (speed) => set({ speed }),
      setPaused: (paused) => set({ paused }),

      addFunds: (amount, type, description) => {
        const state = get();
        const record = { date: { ...state.time }, type, amount, description };
        set({
          finance: {
            funds: state.finance.funds + amount,
            history: [...state.finance.history, record],
          },
          updatedAt: Date.now(),
        });
      },

      spendFunds: (amount, type, description) => {
        const state = get();
        if (state.finance.funds < amount) return false;
        const record = { date: { ...state.time }, type, amount: -amount, description };
        set({
          finance: {
            funds: state.finance.funds - amount,
            history: [...state.finance.history, record],
          },
          updatedAt: Date.now(),
        });
        return true;
      },

      updateEvaluation: (evaluation) => set({ evaluation, updatedAt: Date.now() }),

      updateObjective: (objectiveId, current) => {
        const state = get();
        const objectives = state.objectives.map((o) =>
          o.id === objectiveId ? { ...o, current } : o
        );
        set({ objectives, updatedAt: Date.now() });
      },

      addStation: (station) => {
        const state = get();
        set({
          railwayNetwork: {
            ...state.railwayNetwork,
            stations: [...state.railwayNetwork.stations, station],
          },
          updatedAt: Date.now(),
        });
      },

      removeStation: (stationId) => {
        const state = get();
        set({
          railwayNetwork: {
            ...state.railwayNetwork,
            stations: state.railwayNetwork.stations.filter((s) => s.id !== stationId),
            lines: state.railwayNetwork.lines.map((line) => ({
              ...line,
              stationIds: line.stationIds.filter((id) => id !== stationId),
              segments: line.segments.filter(
                (seg) => seg.startStationId !== stationId && seg.endStationId !== stationId
              ),
            })),
          },
          updatedAt: Date.now(),
        });
      },

      addLine: (line) => {
        const state = get();
        set({
          railwayNetwork: {
            ...state.railwayNetwork,
            lines: [...state.railwayNetwork.lines, line],
          },
          updatedAt: Date.now(),
        });
      },

      removeLine: (lineId) => {
        const state = get();
        set({
          railwayNetwork: {
            ...state.railwayNetwork,
            lines: state.railwayNetwork.lines.filter((l) => l.id !== lineId),
            stations: state.railwayNetwork.stations.map((s) => ({
              ...s,
              lineIds: s.lineIds.filter((id) => id !== lineId),
            })),
          },
          updatedAt: Date.now(),
        });
      },

      updateLineSegment: (lineId, segmentIndex, updates) => {
        const state = get();
        const lines = state.railwayNetwork.lines.map((line) => {
          if (line.id !== lineId) return line;
          const segments = [...line.segments];
          segments[segmentIndex] = { ...segments[segmentIndex], ...updates };
          return { ...line, segments };
        });
        set({
          railwayNetwork: { ...state.railwayNetwork, lines },
          updatedAt: Date.now(),
        });
      },

      addTrain: (train) => {
        const state = get();
        set({
          railwayNetwork: {
            ...state.railwayNetwork,
            trains: [...state.railwayNetwork.trains, train],
          },
          updatedAt: Date.now(),
        });
      },

      removeTrain: (trainId) => {
        const state = get();
        set({
          railwayNetwork: {
            ...state.railwayNetwork,
            trains: state.railwayNetwork.trains.filter((t) => t.id !== trainId),
          },
          updatedAt: Date.now(),
        });
      },

      updatePlayTime: (delta) => set((state) => ({ playTime: state.playTime + delta })),

      reset: () => set({ ...defaultState, id: uuid() }),
    }),
    {
      name: 'nozomi-map-game-storage',
      partialize: (state) => ({
        id: state.id,
        name: state.name,
        createdAt: state.createdAt,
        updatedAt: state.updatedAt,
        playTime: state.playTime,
        scenarioId: state.scenarioId,
        time: state.time,
        speed: state.speed,
        mapId: state.mapId,
        railwayNetwork: state.railwayNetwork,
        finance: state.finance,
        objectives: state.objectives,
        evaluation: state.evaluation,
      }),
    }
  )
);
