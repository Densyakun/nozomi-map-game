'use client';

import { useUIStore } from '@/store/uiStore';
import { useGameStore } from '@/store/gameStore';
import { useTimeStore } from '@/store/timeStore';
import { v4 as uuid } from 'uuid';
import { useState } from 'react';
import type { Station, RailLine, LineSegment } from '@/lib/types';
import { calculateConstructionCost, estimateConstructionDays } from '@/lib/terrain';

export default function ConstructionTool() {
  const activeTool = useUIStore((s) => s.activeTool);
  const setActiveTool = useUIStore((s) => s.setActiveTool);
  const constructionStartPoint = useUIStore((s) => s.constructionStartPoint);
  const constructionEndPoint = useUIStore((s) => s.constructionEndPoint);
  const setConstructionStartPoint = useUIStore((s) => s.setConstructionStartPoint);
  const setConstructionEndPoint = useUIStore((s) => s.setConstructionEndPoint);
  const hoveredPosition = useUIStore((s) => s.hoveredPosition);
  const selectedStationPosition = useUIStore((s) => s.selectedStationPosition);
  const setSelectedStationPosition = useUIStore((s) => s.setSelectedStationPosition);
  const stations = useGameStore((s) => s.railwayNetwork.stations);
  const lines = useGameStore((s) => s.railwayNetwork.lines);
  const addStation = useGameStore((s) => s.addStation);
  const addLine = useGameStore((s) => s.addLine);
  const spendFunds = useGameStore((s) => s.spendFunds);
  const gameTime = useTimeStore((s) => s.gameTime);

  const [stationName, setStationName] = useState('');
  const [lineName, setLineName] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<'surface' | 'elevated' | 'tunnel' | 'bridge'>('surface');

  const handleBuildStation = () => {
    if (!selectedStationPosition || !stationName.trim()) return;
    const cost = 500000;
    if (!spendFunds(cost, 'construction', `駅建設: ${stationName}`)) return;

    const newStation: Station = {
      id: uuid(),
      ownerId: 'player',
      name: stationName.trim(),
      position: { x: selectedStationPosition.x, z: selectedStationPosition.z },
      elevation: 0,
      type: 'normal',
      passengers: 0,
      lineIds: [],
      facilityIds: [],
    };

    addStation(newStation);
    setStationName('');
    setSelectedStationPosition(null);
    setActiveTool(null);
  };

  const handleBuildLine = () => {
    if (!constructionStartPoint?.stationId || !constructionEndPoint?.stationId || !lineName.trim()) return;

    const startStation = stations.find((s) => s.id === constructionStartPoint.stationId);
    if (!startStation) return;

    const endStation = stations.find((s) => s.id === constructionEndPoint.stationId);
    if (!endStation) return;

    if (startStation.id === endStation.id) return;

    const dx = endStation.position.x - startStation.position.x;
    const dz = endStation.position.z - startStation.position.z;
    const length = Math.sqrt(dx * dx + dz * dz);
    const cost = calculateConstructionCost(length, selectedMethod, 1.0);
    const days = estimateConstructionDays(length, selectedMethod);

    if (!spendFunds(cost, 'construction', `路線建設: ${lineName}`)) return;

    const newSegment: LineSegment = {
      startStationId: startStation.id,
      endStationId: endStation.id,
      length: Math.round(length),
      constructionCost: cost,
      constructionMethod: selectedMethod,
      completed: false,
      underConstruction: true,
      remainingDays: days,
    };

    const newLine: RailLine = {
      id: uuid(),
      ownerId: 'player',
      name: lineName.trim(),
      color: '#3b82f6',
      stationIds: [startStation.id, endStation.id],
      segments: [newSegment],
      timetable: [],
      trainIds: [],
    };

    addLine(newLine);

    const updatedStations = stations.map((s) => {
      if (s.id === startStation.id || s.id === endStation.id) {
        return { ...s, lineIds: [...s.lineIds, newLine.id] };
      }
      return s;
    });

    setLineName('');
    setConstructionStartPoint(null);
    setConstructionEndPoint(null);
    setActiveTool(null);
  };

  
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTool(activeTool === 'station' ? null : 'station')}
          className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-colors ${
            activeTool === 'station'
              ? 'bg-blue-600 text-white ring-2 ring-blue-400'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          🚉 駅を建設
        </button>
        <button
          onClick={() => setActiveTool(activeTool === 'line' ? null : 'line')}
          className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-colors ${
            activeTool === 'line'
              ? 'bg-blue-600 text-white ring-2 ring-blue-400'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          🛤 路線を建設
        </button>
      </div>

      {activeTool === 'station' && (
        <div className="bg-slate-800 rounded-xl p-3 space-y-3">
          <p className="text-xs text-slate-400">マップ上の好きな場所をクリックして駅を設置</p>
          <input
            type="text"
            value={stationName}
            onChange={(e) => setStationName(e.target.value)}
            placeholder="駅名を入力"
            className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {selectedStationPosition ? (
            <p className="text-xs font-mono text-emerald-400">
              選択位置: ({selectedStationPosition.x}, {selectedStationPosition.z})
            </p>
          ) : (
            <p className="text-xs font-mono text-slate-500">
              カーソル: {hoveredPosition ? `(${Math.round(hoveredPosition.x)}, ${Math.round(hoveredPosition.z)})` : 'マップ外'}
            </p>
          )}
          <button
            onClick={handleBuildStation}
            disabled={!stationName.trim() || !selectedStationPosition}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded-lg text-sm transition-colors"
          >
            建設する (¥500,000)
          </button>
        </div>
      )}

      {activeTool === 'line' && (
        <div className="bg-slate-800 rounded-xl p-3 space-y-3">
          <p className="text-xs text-slate-400">
            {!constructionStartPoint
              ? '3Dシーン上で始点とする駅をクリック'
              : !constructionEndPoint
              ? '3Dシーン上で終点とする駅をクリック'
              : '路線名を入力して建設'}
          </p>

          {constructionStartPoint && (
            <div className="bg-slate-700 rounded-lg p-2">
              <p className="text-xs text-slate-400 mb-1">始点駅</p>
              <p className="text-sm text-white font-medium">
                {stations.find((s) => s.id === constructionStartPoint.stationId)?.name || '不明'}
              </p>
            </div>
          )}

          {constructionEndPoint && (
            <div className="bg-slate-700 rounded-lg p-2">
              <p className="text-xs text-slate-400 mb-1">終点駅</p>
              <p className="text-sm text-white font-medium">
                {stations.find((s) => s.id === constructionEndPoint.stationId)?.name || '不明'}
              </p>
            </div>
          )}

          {constructionStartPoint && constructionEndPoint && (
            <>
              <input
                type="text"
                value={lineName}
                onChange={(e) => setLineName(e.target.value)}
                placeholder="路線名を入力"
                className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div>
                <p className="text-xs text-slate-400 mb-1">工法</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['surface', 'elevated', 'tunnel', 'bridge'] as const).map((method) => (
                    <button
                      key={method}
                      onClick={() => setSelectedMethod(method)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-colors ${
                        selectedMethod === method
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {method === 'surface' ? '地上' : method === 'elevated' ? '高架' : method === 'tunnel' ? 'トンネル' : '橋梁'}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleBuildLine}
                disabled={!lineName.trim()}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded-lg text-sm transition-colors"
              >
                路線を建設
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
