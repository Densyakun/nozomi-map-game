import { useEffect, useRef, useCallback } from 'react';
import { useTimeStore } from '@/store/timeStore';
import { useGameStore } from '@/store/gameStore';
import { autoSave } from '@/lib/storage';
import { advanceTime } from '@/store/timeStore';
import { runSimulation } from '@/lib/simulation';
import { calculateEvaluation } from '@/lib/evaluation';
import { runCompetitorAI } from '@/lib/aiCompetitor';

export function useGameLoop() {
  const paused = useTimeStore((s) => s.paused);
  const speed = useTimeStore((s) => s.speed);
  const setSpeed = useGameStore((s) => s.setSpeed);
  const setPaused = useGameStore((s) => s.setPaused);
  const setTime = useGameStore((s) => s.setTime);
  const addFunds = useGameStore((s) => s.addFunds);
  const updateEvaluation = useGameStore((s) => s.updateEvaluation);
  const lastTickRef = useRef(0);
  const accumulatedRef = useRef(0);
  const lastSaveRef = useRef('');
  const lastHourRef = useRef('');
  const lastDayRef = useRef('');

  useEffect(() => {
    setSpeed(speed);
  }, [speed, setSpeed]);

  useEffect(() => {
    setPaused(paused);
  }, [paused, setPaused]);

  const tick = useCallback((now: number) => {
    if (paused || speed === 0) {
      lastTickRef.current = now;
      accumulatedRef.current = 0;
      return;
    }

    if (lastTickRef.current === 0) lastTickRef.current = now;
    const delta = now - lastTickRef.current;
    lastTickRef.current = now;

    accumulatedRef.current += delta * speed;

    const msPerGameMinute = 1000;
    const gameMinutesToAdvance = Math.floor(accumulatedRef.current / msPerGameMinute);

    if (gameMinutesToAdvance <= 0) return;

    accumulatedRef.current -= gameMinutesToAdvance * msPerGameMinute;

    const currentTime = useTimeStore.getState().gameTime;
    const newTime = advanceTime(currentTime, gameMinutesToAdvance);
    useTimeStore.getState().setGameTime(newTime);
    setTime(newTime);

    const hourKey = `${newTime.year}-${newTime.month}-${newTime.day}-${newTime.hour}`;
    if (hourKey !== lastHourRef.current) {
      lastHourRef.current = hourKey;
      const state = useGameStore.getState();
      if (state.railwayNetwork.stations.length > 0) {
        const result = runSimulation(state.railwayNetwork, { gridWidth: 50, gridHeight: 50, gridSize: 10 } as any);
        const updatedStations = state.railwayNetwork.stations.map((st) => ({
          ...st,
          passengers: result.stationPassengers[st.id] || 0,
        }));
        useGameStore.setState((s) => ({
          railwayNetwork: { ...s.railwayNetwork, stations: updatedStations },
        }));
        if (result.revenue > 0) {
          addFunds(result.revenue, 'fare', '運賃収入');
        }
      }
    }

    const dayKey = `${newTime.year}-${newTime.month}-${newTime.day}`;
    if (dayKey !== lastDayRef.current) {
      lastDayRef.current = dayKey;
      runCompetitorAI();
      const evaluation = calculateEvaluation();
      updateEvaluation(evaluation);
      autoSave();
    }
  }, [paused, speed, setTime, addFunds, updateEvaluation]);

  useEffect(() => {
    lastTickRef.current = 0;
    accumulatedRef.current = 0;

    const rafLoop = () => {
      tick(Date.now());
      if (!rafStopped) {
        rafId = requestAnimationFrame(rafLoop);
      }
    };

    let rafId = requestAnimationFrame(rafLoop);
    let rafStopped = false;

    return () => {
      rafStopped = true;
      cancelAnimationFrame(rafId);
    };
  }, [tick]);
}
