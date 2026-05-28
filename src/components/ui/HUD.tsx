'use client';

import { useGameStore } from '@/store/gameStore';
import { useTimeStore } from '@/store/timeStore';
import { useEffect, useState } from 'react';

function formatGameTime(time: { year: number; month: number; day: number; hour: number; minute: number }): string {
  return `${time.year}年${time.month}月${time.day}日 ${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
}

export default function HUD() {
  const gameTime = useTimeStore((s) => s.gameTime);
  const speed = useTimeStore((s) => s.speed);
  const paused = useTimeStore((s) => s.paused);
  const funds = useGameStore((s) => s.finance.funds);
  const evaluation = useGameStore((s) => s.evaluation);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <div className="absolute top-0 left-0 right-0 z-30 p-2 flex flex-wrap gap-1.5 justify-between pointer-events-none">
      <div className="flex flex-wrap gap-1.5">
        <div className="bg-black/70 backdrop-blur-sm text-white px-2.5 py-1 rounded text-xs font-mono shadow-lg">
          {formatGameTime(gameTime)}
        </div>
        <div className="bg-black/70 backdrop-blur-sm text-white px-2.5 py-1 rounded text-xs font-mono shadow-lg">
          {paused ? '停止中' : `${speed}倍`}
        </div>
        <div className="bg-black/70 backdrop-blur-sm text-emerald-300 px-2.5 py-1 rounded text-xs font-mono shadow-lg">
          ¥{funds.toLocaleString()}
        </div>
      </div>

      {!isMobile && (
        <div className="bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded text-xs font-mono shadow-lg flex items-center gap-1.5">
          <span className="text-slate-400">総合</span>
          <span className="text-white font-bold">{evaluation.overall}</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">収</span>
          <span className="text-emerald-300">{evaluation.profitability}</span>
          <span className="text-slate-400">輸</span>
          <span className="text-blue-300">{evaluation.transportVolume}</span>
          <span className="text-slate-400">網</span>
          <span className="text-yellow-300">{evaluation.networkCoverage}</span>
          <span className="text-slate-400">財</span>
          <span className="text-purple-300">{evaluation.financialHealth}</span>
        </div>
      )}
    </div>
  );
}
