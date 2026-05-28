'use client';

import { useGameStore } from '@/store/gameStore';

export default function FinancePanel() {
  const funds = useGameStore((s) => s.finance.funds);
  const history = useGameStore((s) => s.finance.history);

  const formatTime = (date: { year: number; month: number; day: number }) =>
    `${date.year}/${String(date.month).padStart(2, '0')}/${String(date.day).padStart(2, '0')}`;

  const typeLabels: Record<string, string> = {
    construction: '建設',
    fare: '運賃収入',
    maintenance: '維持費',
    subsidy: '補助金',
    scenario_reward: 'シナリオ報酬',
    other: 'その他',
  };

  const income = history.filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0);
  const expenses = history.filter((r) => r.amount < 0).reduce((s, r) => s + Math.abs(r.amount), 0);

  return (
    <div className="space-y-3">
      <div className="bg-slate-800 rounded-xl p-3">
        <p className="text-xs text-slate-400 mb-1">現在の資金</p>
        <p className="text-2xl font-bold font-mono text-emerald-300">
          ¥{funds.toLocaleString()}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-800 rounded-xl p-2 text-center">
          <p className="text-xs text-slate-400">総収入</p>
          <p className="text-sm font-bold font-mono text-emerald-400">
            ¥{income.toLocaleString()}
          </p>
        </div>
        <div className="bg-slate-800 rounded-xl p-2 text-center">
          <p className="text-xs text-slate-400">総支出</p>
          <p className="text-sm font-bold font-mono text-red-400">
            ¥{expenses.toLocaleString()}
          </p>
        </div>
      </div>

      <div>
        <p className="text-xs text-slate-400 mb-2">取引履歴</p>
        <div className="max-h-48 overflow-y-auto space-y-1">
          {history.length === 0 && (
            <p className="text-xs text-slate-500">履歴がありません</p>
          )}
          {[...history].reverse().slice(0, 30).map((record, i) => (
            <div
              key={i}
              className="bg-slate-800/50 rounded-lg p-2 flex items-center justify-between"
            >
              <div className="min-w-0">
                <p className="text-xs text-slate-400">{formatTime(record.date)}</p>
                <p className="text-xs text-slate-300 truncate">{typeLabels[record.type] ?? record.type}</p>
                <p className="text-xs text-slate-500 truncate">{record.description}</p>
              </div>
              <span
                className={`text-sm font-mono font-bold shrink-0 ml-2 ${
                  record.amount >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {record.amount >= 0 ? '+' : ''}{record.amount.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
