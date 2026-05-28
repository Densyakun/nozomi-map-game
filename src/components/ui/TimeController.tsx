'use client';

import { useTimeStore } from '@/store/timeStore';
import { useGameStore } from '@/store/gameStore';
import { useEffect, useState } from 'react';

export default function TimeController() {
  const speed = useTimeStore((s) => s.speed);
  const paused = useTimeStore((s) => s.paused);
  const setSpeed = useTimeStore((s) => s.setSpeed);
  const setPaused = useTimeStore((s) => s.setPaused);
  const togglePause = useTimeStore((s) => s.togglePause);
  const gameTime = useTimeStore((s) => s.gameTime);
  const setSpeedStore = useGameStore((s) => s.setSpeed);
  const setPausedStore = useGameStore((s) => s.setPaused);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleSpeedChange = (newSpeed: 0 | 1 | 2 | 5 | 10) => {
    setSpeed(newSpeed);
    setSpeedStore(newSpeed);
  };

  const handlePause = () => {
    togglePause();
    setPausedStore(!paused);
  };

  const speeds = [1, 2, 5, 10] as const;

  if (isMobile) {
    return (
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm rounded-full px-3 py-2 shadow-lg">
        <button
          onClick={handlePause}
          className={`w-8 h-8 flex items-center justify-center rounded-full text-sm transition-colors ${
            paused ? 'bg-yellow-500 text-black' : 'bg-slate-700 text-white'
          }`}
        >
          {paused ? '▶' : '⏸'}
        </button>
        {speeds.map((s) => (
          <button
            key={s}
            onClick={() => handleSpeedChange(s)}
            className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold transition-colors ${
              !paused && speed === s
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
      <button
        onClick={handlePause}
        className={`w-8 h-8 flex items-center justify-center rounded-full text-sm transition-colors ${
          paused ? 'bg-yellow-500 text-black' : 'bg-slate-700 text-white hover:bg-slate-600'
        }`}
      >
        {paused ? '▶' : '⏸'}
      </button>
      <div className="w-px h-5 bg-slate-600" />
      {speeds.map((s) => (
        <button
          key={s}
          onClick={() => handleSpeedChange(s)}
          className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold transition-colors ${
            !paused && speed === s
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          {s}x
        </button>
      ))}
    </div>
  );
}
