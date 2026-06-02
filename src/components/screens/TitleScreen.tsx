'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TitleScreen() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => {
    setMounted(true);
    const index = localStorage.getItem('nozomi-map-game-save-index');
    if (index) {
      try {
        const slots = JSON.parse(index);
        setHasSave(slots.length > 0);
      } catch {
        setHasSave(false);
      }
    }
  }, []);

  const handleNewGame = () => {
    router.push('/select-scenario');
  };

  const handleLoadGame = () => {
    router.push('/game?mode=load');
  };

  const isDisabled = !mounted || !hasSave;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-950 via-slate-900 to-slate-950 p-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight">
          Nozomi Map Game
        </h1>
        <p className="text-lg md:text-xl text-blue-300/80">
          3D地図上で鉄道網を構築し、都市を発展させよう
        </p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <button
          onClick={handleNewGame}
          className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg rounded-xl transition-colors active:scale-95"
        >
          新しく始める
        </button>

        <button
          onClick={handleLoadGame}
          disabled={isDisabled}
          className={`w-full py-4 px-6 font-bold text-lg rounded-xl transition-colors active:scale-95 ${
            !isDisabled
              ? 'bg-slate-700 hover:bg-slate-600 text-white'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          続きから
        </button>

        <button
          className="w-full py-4 px-6 border border-slate-600 text-slate-300 font-bold text-lg rounded-xl hover:bg-slate-800/50 transition-colors active:scale-95"
        >
          マルチプレイ
        </button>
      </div>

      <p className="mt-12 text-slate-500 text-sm">
        シングルプレイ: ローカル保存 / マルチプレイ: Supabase同期
      </p>
    </div>
  );
}
