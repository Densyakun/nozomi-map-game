'use client';

import { useRouter } from 'next/navigation';

export default function MapSelect() {
  const router = useRouter();

  const handleSelectMap = (mapId: string) => {
    router.push(`/game?mode=free&map=${mapId}`);
  };

  const maps = [
    {
      id: 'demo-map-001',
      name: 'デモマップ',
      description: '中央に都市、川と湖のある標準的なマップ。鉄道建設の基本を学べます。',
      difficulty: '初級',
      gridSize: '50×50',
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-950 via-slate-900 to-slate-950 p-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">マップ選択</h1>
        <p className="text-slate-400">プレイするマップを選択してください</p>
      </div>

      <div className="w-full max-w-lg space-y-4">
        {maps.map((map) => (
          <button
            key={map.id}
            onClick={() => handleSelectMap(map.id)}
            className="w-full text-left bg-slate-800 hover:bg-slate-700 rounded-xl p-4 border border-slate-700 transition-colors"
          >
            <div className="flex items-start justify-between mb-1">
              <span className="text-white font-bold">{map.name}</span>
              <span className="text-xs text-emerald-400 px-2 py-0.5 rounded border border-emerald-700">
                {map.difficulty}
              </span>
            </div>
            <p className="text-sm text-slate-400 mb-2">{map.description}</p>
            <div className="text-xs text-slate-500">
              グリッド: {map.gridSize}
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={() => router.push('/')}
        className="mt-8 text-slate-500 hover:text-slate-300 text-sm transition-colors"
      >
        ← タイトルに戻る
      </button>
    </div>
  );
}
