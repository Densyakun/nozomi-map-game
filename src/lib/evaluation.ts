import { useGameStore } from '@/store/gameStore';
import { useTimeStore } from '@/store/timeStore';
import type { Evaluation, ScoreGrade } from '@/lib/types';

const gradeThresholds: Record<string, number[]> = {
  profitability: [1.5, 1.2, 1.0, 0.8, 0.5],
  transportVolume: [0.8, 0.6, 0.4, 0.2, 0.1],
  networkCoverage: [0.6, 0.45, 0.3, 0.15, 0.05],
  financialHealth: [50000000, 20000000, 10000000, 5000000, 1000000],
  punctuality: [0.95, 0.85, 0.75, 0.6, 0.4],
};

function valueToGrade(value: number, thresholds: number[]): ScoreGrade {
  const grades: ScoreGrade[] = ['S', 'A', 'B', 'C', 'D', 'E'];
  for (let i = 0; i < thresholds.length; i++) {
    if (value >= thresholds[i]) return grades[i];
  }
  return 'E';
}

const gradeScores: Record<ScoreGrade, number> = { S: 5, A: 4, B: 3, C: 2, D: 1, E: 0 };

export function calculateEvaluation(): Evaluation {
  const state = useGameStore.getState();
  const gameTime = useTimeStore.getState().gameTime;

  const monthlyRevenue = calculateMonthlyRevenue(state);
  const monthlyExpenses = calculateMonthlyExpenses(state);
  const profitRatio = monthlyExpenses > 0 ? monthlyRevenue / monthlyExpenses : 1;

  const totalMapPop = 200000;
  const coveragePop = calculateCoveragePopulation(state);
  const coverageRatio = totalMapPop > 0 ? coveragePop / totalMapPop : 0;

  const totalTrainPassengers = state.railwayNetwork.stations.reduce(
    (sum, s) => sum + s.passengers, 0
  );
  const transportRatio = totalMapPop > 0 ? totalTrainPassengers / (totalMapPop * 0.3) : 0;

  const profitability = valueToGrade(profitRatio, gradeThresholds.profitability);
  const transportVolume = valueToGrade(transportRatio, gradeThresholds.transportVolume);
  const networkCoverage = valueToGrade(coverageRatio, gradeThresholds.networkCoverage);
  const financialHealth = valueToGrade(state.finance.funds, gradeThresholds.financialHealth);
  const punctuality: ScoreGrade = 'B';

  const avgScore =
    (gradeScores[profitability] +
      gradeScores[transportVolume] +
      gradeScores[networkCoverage] +
      gradeScores[financialHealth] +
      gradeScores[punctuality]) /
    5;

  let overall: ScoreGrade;
  if (avgScore >= 4.5) overall = 'S';
  else if (avgScore >= 3.5) overall = 'A';
  else if (avgScore >= 2.5) overall = 'B';
  else if (avgScore >= 1.5) overall = 'C';
  else if (avgScore >= 0.5) overall = 'D';
  else overall = 'E';

  return {
    overall,
    profitability,
    transportVolume,
    networkCoverage,
    financialHealth,
    punctuality,
  };
}

function calculateMonthlyRevenue(state: ReturnType<typeof useGameStore.getState>): number {
  let revenue = 0;
  for (const station of state.railwayNetwork.stations) {
    if (station.ownerId === 'player') {
      revenue += station.passengers * 200;
    }
  }
  return revenue;
}

function calculateMonthlyExpenses(state: ReturnType<typeof useGameStore.getState>): number {
  let expenses = 0;
  for (const line of state.railwayNetwork.lines) {
    if (line.ownerId === 'player') {
      for (const seg of line.segments) {
        if (seg.completed) {
          expenses += seg.length * 100;
        }
      }
    }
  }
  for (const station of state.railwayNetwork.stations) {
    if (station.ownerId === 'player') {
      expenses += 50000;
    }
  }
  return expenses;
}

function calculateCoveragePopulation(state: ReturnType<typeof useGameStore.getState>): number {
  let pop = 0;
  for (const station of state.railwayNetwork.stations) {
    if (station.ownerId === 'player') {
      pop += 5000;
    }
  }
  return pop;
}
