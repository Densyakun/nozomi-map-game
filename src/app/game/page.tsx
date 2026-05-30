'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useGameStore } from '@/store/gameStore';
import { useUIStore } from '@/store/uiStore';
import { useTimeStore } from '@/store/timeStore';
import { useGameLoop } from '@/hooks/useGameLoop';
import { generateDemoMapData } from '@/lib/demoMapData';
import { getScenarioById } from '@/data/scenarios';
import { autoSave } from '@/lib/storage';
import type { ObjectiveProgress, MapData } from '@/lib/types';
import HUD from '@/components/ui/HUD';
import SidePanel from '@/components/ui/SidePanel';
import BottomSheet from '@/components/ui/BottomSheet';
import TimeController from '@/components/ui/TimeController';
import Modal from '@/components/common/Modal';
import Compass from '@/components/ui/Compass';

const GameCanvas = dynamic(() => import('@/components/game/GameCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-slate-900">
      <p className="text-slate-400">読み込み中...</p>
    </div>
  ),
});

export default function GamePage() {
  const [mapData] = useState<MapData>(() => generateDemoMapData());
  const [showMenu, setShowMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const initialised = useRef(false);
  const cameraDirection = useUIStore((s) => s.cameraDirection);

  const initNewGame = useGameStore((s) => s.initNewGame);
  const initScenarioGame = useGameStore((s) => s.initScenarioGame);
  const resetUI = useUIStore((s) => s.reset);
  const setOpenPanel = useUIStore((s) => s.setOpenPanel);

  const paused = useTimeStore((s) => s.paused);
  const speed = useTimeStore((s) => s.speed);
  const scenarioId = useGameStore((s) => s.scenarioId);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;

    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const scenarioIdParam = params.get('scenario');

    if (mode === 'scenario' && scenarioIdParam) {
      const scenario = getScenarioById(scenarioIdParam);
      if (scenario) {
        const objProgress: ObjectiveProgress[] = scenario.objectives.map((o) => ({
          id: o.id,
          completed: false,
          current: 0,
          target: o.target,
        }));
        initScenarioGame(scenario.name, scenario.mapId, scenario.id, scenario.startFunds, objProgress);
        setOpenPanel('none');
      } else {
        initNewGame('My Railway', 'demo-map-001');
      }
    } else if (mode === 'new') {
      initNewGame('フリープレイ', 'demo-map-001');
    } else if (mode === 'load') {
      const index = localStorage.getItem('nozomi-map-game-save-index');
      if (index) {
        try {
          const slots = JSON.parse(index);
          if (slots.length > 0) {
            const data = localStorage.getItem(`nozomi-map-game-save-${slots[0].id}`);
            if (data) {
              const restored = JSON.parse(data);
              useGameStore.setState(restored);
              useTimeStore.getState().setGameTime(restored.time);
              useTimeStore.getState().setSpeed(restored.speed || 1);
            }
          }
        } catch { /* ignore */ }
      }
    }

    return () => {
      resetUI();
      useTimeStore.getState().reset();
    };
  }, [initNewGame, initScenarioGame, resetUI, setOpenPanel]);

  useGameLoop();

  const handleSave = () => {
    autoSave();
    setShowMenu(false);
  };

  const handleExit = () => {
    window.location.href = '/';
  };

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden">
      <div className={`flex flex-col flex-1 relative min-w-0 ${isMobile ? '' : ''}`}>
        <HUD />
        {!isMobile && <Compass cameraDirection={cameraDirection} />}
        <GameCanvas mapData={mapData} showGrid={true} />
        <div className={`absolute ${isMobile ? 'bottom-32' : 'bottom-6'} left-1/2 -translate-x-1/2 z-30`}>
          <TimeController />
        </div>

        {!isMobile && (
          <button
            onClick={() => setShowMenu(true)}
            className="absolute top-20 left-3 z-40 w-9 h-9 bg-white/80 hover:bg-white shadow rounded-lg flex items-center justify-center text-sm text-slate-700 transition-colors"
            aria-label="メニュー"
          >
            ☰
          </button>
        )}

        {isMobile && (
          <button
            onClick={() => setShowMenu(true)}
            className="absolute top-20 right-3 z-40 w-9 h-9 bg-white/80 hover:bg-white shadow rounded-lg flex items-center justify-center text-sm text-slate-700 transition-colors"
            aria-label="メニュー"
          >
            ☰
          </button>
        )}

        {isMobile && <BottomSheet />}
      </div>

      {!isMobile && <SidePanel />}

      <Modal open={showMenu} onClose={() => setShowMenu(false)} title="メニュー">
        <div className="space-y-3">
          <button
            onClick={handleSave}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors"
          >
            💾 セーブ
          </button>
          <button
            onClick={handleExit}
            className="w-full py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors"
          >
            🚪 タイトルに戻る
          </button>
          <p className="text-xs text-slate-500 text-center mt-4">
            {paused ? '停止中' : `速度: ${speed}x`} | 駅: {useGameStore.getState().railwayNetwork.stations.length} | 路線: {useGameStore.getState().railwayNetwork.lines.length}
          </p>
        </div>
      </Modal>
    </div>
  );
}
