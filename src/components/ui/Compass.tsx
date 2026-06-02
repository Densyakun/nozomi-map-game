'use client';

import { useRef, useEffect } from 'react';

interface CompassProps {
  cameraDirection?: number; // rotation in degrees
}

export default function Compass({ cameraDirection }: CompassProps) {
  const compassRef = useRef<HTMLDivElement>(null);
  const currentRotationRef = useRef(0);

  useEffect(() => {
    const compass = compassRef.current;
    if (!compass || cameraDirection === undefined) return;

    // Calculate the shortest rotation path
    let targetRotation = cameraDirection + 180; // Add 180 degree offset
    const currentRotation = currentRotationRef.current;

    // Normalize to -180 to 180 range
    const normalizeAngle = (angle: number) => {
      while (angle > 180) angle -= 360;
      while (angle < -180) angle += 360;
      return angle;
    };

    const normalizedTarget = normalizeAngle(targetRotation);
    const normalizedCurrent = normalizeAngle(currentRotation);

    // Calculate the difference
    let diff = normalizedTarget - normalizedCurrent;

    // Adjust to take the shortest path
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    const newRotation = currentRotation + diff;
    currentRotationRef.current = newRotation;

    compass.style.transform = `rotate(${newRotation}deg)`;
  }, [cameraDirection]);

  return (
    <div className="absolute top-20 right-4 z-20 pointer-events-none">
      <div className="relative w-16 h-16 bg-slate-900/80 backdrop-blur-sm rounded-full border-2 border-slate-600 shadow-lg">
        <div ref={compassRef} className="absolute inset-0 flex items-center justify-center transition-transform duration-100">
          {/* North */}
          <div className="absolute top-1 text-red-500 font-bold text-xs">N</div>
          {/* South */}
          <div className="absolute bottom-1 text-slate-400 font-bold text-xs">S</div>
          {/* East */}
          <div className="absolute right-1 text-slate-400 font-bold text-xs">E</div>
          {/* West */}
          <div className="absolute left-1 text-slate-400 font-bold text-xs">W</div>
          {/* Center indicator */}
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
