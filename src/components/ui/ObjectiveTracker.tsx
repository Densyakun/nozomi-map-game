'use client';

import { useGameStore } from '@/store/gameStore';
import { getScenarioById } from '@/data/scenarios';

export default function ObjectiveTracker() {
  const objectives = useGameStore((s) => s.objectives);
  const scenarioId = useGameStore((s) => s.scenarioId);

  if (objectives.length === 0) return null;

  const scenario = scenarioId ? getScenarioById(scenarioId) : null;

  const typeLabels: Record<string, string> = {
    passengers: '🚉 輸送量',
    profit: '💰 収益',
    coverage: '🗺 路線網',
    punctuality: '⏱ 定時性',
    custom: '🎯 目標',
  };

  return (
    <div className="bg-slate-800 rounded-xl p-3">
      <p className="text-xs text-slate-400 mb-2 font-bold">シナリオ目標</p>
      <div className="space-y-2">
        {objectives.map((obj) => {
          const scenarioObj = scenario?.objectives.find((o) => o.id === obj.id);
          const typeLabel = scenarioObj ? (typeLabels[scenarioObj.type] ?? '🎯 目標') : '🎯 目標';
          const progress = obj.target > 0 ? Math.min(100, (obj.current / obj.target) * 100) : 0;
          const isComplete = obj.completed || obj.current >= obj.target;

          return (
            <div key={obj.id} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className={`${isComplete ? 'text-emerald-400' : 'text-slate-300'}`}>
                  {typeLabel}
                </span>
                <span className={`text-xs font-mono ${isComplete ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {isComplete ? '✓ 達成' : `${obj.current}/${obj.target}`}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isComplete ? 'bg-emerald-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
