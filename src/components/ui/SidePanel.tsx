'use client';

import { useGameStore } from '@/store/gameStore';
import { useUIStore } from '@/store/uiStore';
import MiniMap from './MiniMap';
import ConstructionTool from './ConstructionTool';
import FinancePanel from './FinancePanel';
import TimetableEditor from './TimetableEditor';
import EvaluationPanel from './EvaluationPanel';
import ObjectiveTracker from './ObjectiveTracker';

export default function SidePanel() {
  const openPanel = useUIStore((s) => s.openPanel);
  const setOpenPanel = useUIStore((s) => s.setOpenPanel);
  const selectedElementId = useUIStore((s) => s.selectedElementId);
  const selectedElementType = useUIStore((s) => s.selectedElementType);
  const scenarioId = useGameStore((s) => s.scenarioId);

  return (
    <div className="w-64 bg-slate-900/95 backdrop-blur-sm border-l border-slate-700 flex flex-col overflow-y-auto">
      <div className="p-3 border-b border-slate-700">
        <MiniMap />
      </div>

      <div className="p-3 border-b border-slate-700 space-y-1.5">
        <p className="text-xs text-slate-400 mb-2 font-bold">メニュー</p>
        <button
          onClick={() => setOpenPanel(openPanel === 'construction' ? 'none' : 'construction')}
          className={`w-full text-left py-2 px-3 rounded-lg text-sm transition-colors ${
            openPanel === 'construction' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          🏗 建設
        </button>
        <button
          onClick={() => setOpenPanel(openPanel === 'timetable' ? 'none' : 'timetable')}
          className={`w-full text-left py-2 px-3 rounded-lg text-sm transition-colors ${
            openPanel === 'timetable' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          🕐 ダイヤ
        </button>
        <button
          onClick={() => setOpenPanel(openPanel === 'finance' ? 'none' : 'finance')}
          className={`w-full text-left py-2 px-3 rounded-lg text-sm transition-colors ${
            openPanel === 'finance' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          💰 財務
        </button>
      </div>

      <div className="flex-1 p-3 overflow-y-auto">
        {openPanel === 'construction' && <ConstructionTool />}
        {openPanel === 'timetable' && <TimetableEditor />}
        {openPanel === 'finance' && <FinancePanel />}

        {openPanel === 'none' && (
          <div className="space-y-3">
            <EvaluationPanel />
            {scenarioId && <ObjectiveTracker />}
          </div>
        )}
      </div>

      {selectedElementId && (
        <div className="p-3 border-t border-slate-700 bg-slate-800/50">
          <p className="text-xs text-slate-400 mb-1">選択中</p>
          <p className="text-sm text-white font-mono">
            {selectedElementType}: {selectedElementId.slice(0, 8)}
          </p>
        </div>
      )}
    </div>
  );
}
