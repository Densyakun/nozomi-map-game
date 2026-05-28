'use client';

import { useGameStore } from '@/store/gameStore';
import type { ScoreGrade } from '@/lib/types';

const gradeColors: Record<ScoreGrade, string> = {
  S: 'text-yellow-300',
  A: 'text-emerald-400',
  B: 'text-blue-400',
  C: 'text-slate-300',
  D: 'text-orange-400',
  E: 'text-red-400',
};

export default function EvaluationPanel() {
  const evaluation = useGameStore((s) => s.evaluation);

  const items: { label: string; key: keyof typeof evaluation; sub: string }[] = [
    { label: '総合評価', key: 'overall', sub: '' },
    { label: '収益性', key: 'profitability', sub: '利益率' },
    { label: '輸送量', key: 'transportVolume', sub: '利用者数' },
    { label: '路線網', key: 'networkCoverage', sub: 'カバー人口' },
    { label: '財務', key: 'financialHealth', sub: '資金残高' },
    { label: '定時性', key: 'punctuality', sub: '遅延率' },
  ];

  return (
    <div className="bg-slate-800 rounded-xl p-3">
      <p className="text-xs text-slate-400 mb-2 font-bold">経営評価</p>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between">
            <div>
              <span className="text-sm text-slate-300">{item.label}</span>
              {item.sub && <span className="text-xs text-slate-500 ml-1">({item.sub})</span>}
            </div>
            <span className={`text-lg font-bold font-mono ${gradeColors[evaluation[item.key]]}`}>
              {evaluation[item.key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
