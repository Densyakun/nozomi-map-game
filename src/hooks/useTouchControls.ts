import { useState, useCallback, useRef, useEffect } from 'react';
import type { ConstructionMethod } from '@/lib/types';

export function useTouchControls(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [touchDistance, setTouchDistance] = useState(0);
  const [isPinching, setIsPinching] = useState(false);
  const lastPinchDist = useRef(0);

  const getPinchDistance = useCallback((touches: TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[1].clientX - touches[0].clientX;
    const dy = touches[1].clientY - touches[0].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        setIsPinching(true);
        lastPinchDist.current = getPinchDistance(e.touches);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length >= 2 && isPinching) {
        e.preventDefault();
        const dist = getPinchDistance(e.touches);
        setTouchDistance(dist - lastPinchDist.current);
        lastPinchDist.current = dist;
      }
    };

    const onTouchEnd = () => {
      setIsPinching(false);
      setTouchDistance(0);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [containerRef, isPinching, getPinchDistance]);

  return {
    pinchDelta: touchDistance,
    isPinching,
  };
}
