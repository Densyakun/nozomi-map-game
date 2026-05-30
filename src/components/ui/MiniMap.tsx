'use client';

import { useRef, useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';

export default function MiniMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stations = useGameStore((s) => s.railwayNetwork.stations);
  const lines = useGameStore((s) => s.railwayNetwork.lines);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    const mapW = 500;
    const mapH = 500;
    const scale = Math.min(w / mapW, h / mapH);

    const toScreen = (x: number, z: number) => ({
      sx: w / 2 + (x / mapW) * w * 0.8,
      sy: h / 2 + (z / mapH) * h * 0.8,
    });

    ctx.strokeStyle = '#2a2a3e';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 10; i++) {
      const p = (i / 10) * w * 0.8;
      ctx.beginPath();
      ctx.moveTo(w * 0.1, h * 0.1 + p);
      ctx.lineTo(w * 0.1 + w * 0.8, h * 0.1 + p);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w * 0.1 + p, h * 0.1);
      ctx.lineTo(w * 0.1 + p, h * 0.1 + h * 0.8);
      ctx.stroke();
    }

    for (const line of lines) {
      ctx.strokeStyle = line.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < line.stationIds.length; i++) {
        const st = stations.find((s) => s.id === line.stationIds[i]);
        if (!st) continue;
        const { sx, sy } = toScreen(st.position.x, st.position.z);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }

    for (const st of stations) {
      const { sx, sy } = toScreen(st.position.x, st.position.z);
      ctx.fillStyle = st.ownerId === 'player' ? '#3b82f6' : '#ef4444';
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1;
    ctx.strokeRect(w * 0.1, h * 0.1, w * 0.8, h * 0.8);

    // Draw compass directions
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', w / 2, h * 0.05);
    
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('S', w / 2, h * 0.95);
    ctx.fillText('E', w * 0.95, h / 2);
    ctx.fillText('W', w * 0.05, h / 2);
  }, [stations, lines]);

  if (isMobile) return null;

  return (
    <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden shadow-lg">
      <canvas ref={canvasRef} width={160} height={160} className="w-full h-full" />
    </div>
  );
}
