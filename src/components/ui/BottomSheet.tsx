'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import ConstructionTool from './ConstructionTool';
import TimetableEditor from './TimetableEditor';
import FinancePanel from './FinancePanel';
import EvaluationPanel from './EvaluationPanel';
import ObjectiveTracker from './ObjectiveTracker';
import { useGameStore } from '@/store/gameStore';
import { useUIStore } from '@/store/uiStore';

const SNAP_POINTS = [60, 200, 400];
const SNAP_THRESHOLD = 30;

export default function BottomSheet() {
  const [sheetHeight, setSheetHeight] = useState(SNAP_POINTS[0]);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const startHeight = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const scenarioId = useGameStore((s) => s.scenarioId);
  const openPanel = useUIStore((s) => s.openPanel);
  const setOpenPanel = useUIStore((s) => s.setOpenPanel);
  const setActiveTool = useUIStore((s) => s.setActiveTool);

  const snapToNearest = useCallback((height: number) => {
    return SNAP_POINTS.reduce((prev, curr) =>
      Math.abs(curr - height) < Math.abs(prev - height) ? curr : prev
    );
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStartY.current = e.clientY;
    startHeight.current = sheetHeight;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const delta = dragStartY.current - e.clientY;
    const newHeight = Math.max(
      SNAP_POINTS[0],
      Math.min(SNAP_POINTS[SNAP_POINTS.length - 1], startHeight.current + delta)
    );
    setSheetHeight(newHeight);
  };

  const handlePointerUp = () => {
    if (isDragging) {
      setIsDragging(false);
      setSheetHeight(snapToNearest(sheetHeight));
    }
  };

  const handleSelectTool = (tool: 'station' | 'line' | 'demolish' | null) => {
    setActiveTool(tool);
    if (tool) setSheetHeight(SNAP_POINTS[2]);
  };

  return (
    <div
      ref={sheetRef}
      className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-700 rounded-t-2xl shadow-2xl transition-[height] duration-300 ease-out"
      style={{ height: sheetHeight, touchAction: 'none' }}
    >
      <div
        className="w-full flex justify-center py-2 cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="w-10 h-1 bg-slate-500 rounded-full" />
      </div>

      <div className="px-4 pb-4 overflow-y-auto h-[calc(100%-28px)]">
        <div className="flex gap-2 mb-3 overflow-x-auto">
          <button onClick={() => handleSelectTool('station')} className={`shrink-0 py-2 px-4 rounded-lg text-sm font-bold transition-colors ${openPanel === 'construction' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}>🚉 駅</button>
          <button onClick={() => handleSelectTool('line')} className={`shrink-0 py-2 px-4 rounded-lg text-sm font-bold transition-colors ${openPanel === 'construction' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}>🛤 路線</button>
          <button onClick={() => setOpenPanel(openPanel === 'timetable' ? 'none' : 'timetable')} className={`shrink-0 py-2 px-4 rounded-lg text-sm font-bold transition-colors ${openPanel === 'timetable' ? 'bg-slate-600 text-white' : 'bg-slate-700 text-slate-300'}`}>🕐 ダイヤ</button>
          <button onClick={() => setOpenPanel(openPanel === 'finance' ? 'none' : 'finance')} className={`shrink-0 py-2 px-4 rounded-lg text-sm font-bold transition-colors ${openPanel === 'finance' ? 'bg-slate-600 text-white' : 'bg-slate-700 text-slate-300'}`}>💰 財務</button>
        </div>

        <div className="space-y-3">
          {openPanel === 'construction' && <ConstructionTool />}
          {openPanel === 'timetable' && <TimetableEditor />}
          {openPanel === 'finance' && <FinancePanel />}
          {openPanel === 'none' && (
            <>
              <EvaluationPanel />
              {scenarioId && <ObjectiveTracker />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
