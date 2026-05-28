'use client';

import { useGameStore } from '@/store/gameStore';
import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import type { TimetableEntry } from '@/lib/types';

export default function TimetableEditor() {
  const lines = useGameStore((s) => s.railwayNetwork.lines);
  const stations = useGameStore((s) => s.railwayNetwork.stations);
  const addLine = useGameStore((s) => s.addLine);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [intervalMinutes, setIntervalMinutes] = useState(10);

  const selectedLine = lines.find((l) => l.id === selectedLineId);

  const handleAddTimetable = () => {
    if (!selectedLine) return;
    const trainId = uuid();
    const departures = selectedLine.stationIds.map((sid, i) => {
      const mins = i * 3;
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return {
        stationId: sid,
        arrivalTime: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
        departureTime: `${String(h).padStart(2, '0')}:${String(m + 1).padStart(2, '0')}`,
      };
    });

    const entry: TimetableEntry = {
      trainId,
      lineId: selectedLine.id,
      direction: 'up',
      departures,
      intervalMinutes,
    };

    const updatedLine = {
      ...selectedLine,
      timetable: [...selectedLine.timetable, entry],
      trainIds: [...selectedLine.trainIds, trainId],
    };

    const updatedLines = lines.map((l) => (l.id === selectedLine.id ? updatedLine : l));
    useGameStore.setState((state) => ({
      railwayNetwork: { ...state.railwayNetwork, lines: updatedLines },
    }));
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-bold text-white">ダイヤ編集</p>

      <div className="space-y-1">
        {lines.filter((l) => l.ownerId === 'player').map((line) => (
          <button
            key={line.id}
            onClick={() => setSelectedLineId(line.id)}
            className={`w-full text-left py-2 px-3 rounded-lg text-sm transition-colors flex items-center gap-2 ${
              selectedLineId === line.id ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: line.color }} />
            {line.name}
            <span className="text-xs text-slate-400 ml-auto">{line.timetable.length}便</span>
          </button>
        ))}
        {lines.filter((l) => l.ownerId === 'player').length === 0 && (
          <p className="text-xs text-slate-500">路線がありません</p>
        )}
      </div>

      {selectedLine && (
        <div className="bg-slate-800 rounded-xl p-3 space-y-3">
          <p className="text-xs text-slate-400">
            路線: {selectedLine.name} | 駅数: {selectedLine.stationIds.length}
          </p>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">間隔:</span>
            <input
              type="number"
              value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(Math.max(1, Number(e.target.value)))}
              className="w-16 bg-slate-700 text-white px-2 py-1 rounded text-xs text-center"
              min={1}
            />
            <span className="text-xs text-slate-400">分</span>
          </div>

          <button
            onClick={handleAddTimetable}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-sm transition-colors"
          >
            ダイヤ追加
          </button>

          {selectedLine.timetable.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-400">設定済みダイヤ</p>
              {selectedLine.timetable.map((entry, i) => (
                <div key={entry.trainId} className="bg-slate-700 rounded-lg p-2 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>#{i + 1} {entry.direction === 'up' ? '上り' : '下り'}</span>
                    <span className="text-slate-500">{entry.intervalMinutes}分間隔</span>
                  </div>
                  <div className="mt-1 text-slate-400">
                    {entry.departures.map((d, j) => {
                      const st = stations.find((s) => s.id === d.stationId);
                      return (
                        <span key={d.stationId}>
                          {j > 0 && ' → '}
                          {st?.name ?? d.stationId.slice(0, 4)} ({d.departureTime})
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
