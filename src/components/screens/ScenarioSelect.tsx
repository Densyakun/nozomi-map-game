'use client';

import { useRouter } from 'next/navigation';
import { demoScenarios } from '@/data/scenarios';

export default function ScenarioSelect() {
  const router = useRouter();

  const handleSelectScenario = (scenarioId: string) => {
    router.push(`/game?mode=scenario&scenario=${scenarioId}`);
  };

  const handleFreePlay = () => {
    router.push('/game?mode=new');
  };

  const difficultyColors: Record<string, string> = {
    easy: 'text-emerald-400 border-emerald-700',
    normal: 'text-yellow-400 border-yellow-700',
    hard: 'text-red-400 border-red-700',
  };

  const difficultyLabels: Record<string, string> = {
    easy: '初級',
    normal: '中級',
    hard: '上級',
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-950 via-slate-900 to-slate-950 p-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">ゲームモード選択</h1>
        <p className="text-slate-400">シナリオに挑戦するか、自由に建設するかを選んでください</p>
      </div>

      <div className="w-full max-w-lg space-y-4">
        <div className="space-y-3">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">シナリオ</p>
          {demoScenarios.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => handleSelectScenario(scenario.id)}
              className={`w-full text-left bg-slate-800 hover:bg-slate-700 rounded-xl p-4 border border-slate-700 transition-colors ${difficultyColors[scenario.difficulty]}`}
            >
              <div className="flex items-start justify-between mb-1">
                <span className="text-white font-bold">{scenario.name}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded border ${difficultyColors[scenario.difficulty]}`}>
                  {difficultyLabels[scenario.difficulty]}
                </span>
              </div>
              <p className="text-sm text-slate-400 mb-2">{scenario.description}</p>
              <div className="flex gap-2 text-xs text-slate-500">
                <span>開始資金: ¥{scenario.startFunds.toLocaleString()}</span>
                <span>目標: {scenario.objectives.length}個</span>
                {scenario.competitors.length > 0 && (
                  <span>競合: {scenario.competitors.length}社</span>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="pt-4 border-t border-slate-700">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">フリープレイ</p>
          <button
            onClick={handleFreePlay}
            className="w-full text-left bg-slate-800 hover:bg-slate-700 rounded-xl p-4 border border-slate-700 border-dashed transition-colors"
          >
            <p className="text-white font-bold mb-1">🆓 フリープレイ</p>
            <p className="text-sm text-slate-400">制限なしで自由に鉄道網を構築できます</p>
          </button>
        </div>
      </div>
    </div>
  );
}
