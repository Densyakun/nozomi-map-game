'use client';

import { useCallback, useEffect } from 'react';
import { useUIStore } from '@/store/uiStore';

interface MapControlsProps {
  showGrid: boolean;
  onToggleGrid: () => void;
}

export default function MapControls({
  showGrid,
  onToggleGrid,
}: MapControlsProps) {
  const showMiniMap = useUIStore((s) => s.showMiniMap);
  const setShowMiniMap = useUIStore((s) => s.setShowMiniMap);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'g' || e.key === 'G') onToggleGrid();
      if (e.key === 'm' || e.key === 'M') setShowMiniMap(!showMiniMap);
    },
    [onToggleGrid, setShowMiniMap, showMiniMap]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return null;
}
