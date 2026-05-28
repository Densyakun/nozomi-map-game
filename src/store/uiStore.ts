import { create } from 'zustand';
import type { ConstructionTool, PanelName } from '@/lib/types';

interface UIState {
  activeTool: ConstructionTool;
  selectedElementId: string | null;
  selectedElementType: 'station' | 'line' | 'train' | null;
  openPanel: PanelName;
  isMobile: boolean;
  showMiniMap: boolean;
  hoveredPosition: { x: number; z: number } | null;
  constructionStartPoint: { x: number; z: number; stationId?: string } | null;
  speedDialOpen: boolean;
}

interface UIActions {
  setActiveTool: (tool: ConstructionTool) => void;
  setSelectedElement: (id: string | null, type: UIState['selectedElementType']) => void;
  setOpenPanel: (panel: PanelName) => void;
  setIsMobile: (isMobile: boolean) => void;
  setShowMiniMap: (show: boolean) => void;
  setHoveredPosition: (pos: { x: number; z: number } | null) => void;
  setConstructionStartPoint: (point: UIState['constructionStartPoint']) => void;
  setSpeedDialOpen: (open: boolean) => void;
  reset: () => void;
}

const defaultUIState: UIState = {
  activeTool: null,
  selectedElementId: null,
  selectedElementType: null,
  openPanel: 'none',
  isMobile: false,
  showMiniMap: true,
  hoveredPosition: null,
  constructionStartPoint: null,
  speedDialOpen: false,
};

export const useUIStore = create<UIState & UIActions>()((set) => ({
  ...defaultUIState,

  setActiveTool: (tool) =>
    set({
      activeTool: tool,
      openPanel: tool ? 'construction' : 'none',
      constructionStartPoint: null,
    }),

  setSelectedElement: (id, type) =>
    set({ selectedElementId: id, selectedElementType: type }),

  setOpenPanel: (panel) => set({ openPanel: panel }),

  setIsMobile: (isMobile) => set({ isMobile }),

  setShowMiniMap: (show) => set({ showMiniMap: show }),

  setHoveredPosition: (pos) => set({ hoveredPosition: pos }),

  setConstructionStartPoint: (point) => set({ constructionStartPoint: point }),

  setSpeedDialOpen: (open) => set({ speedDialOpen: open }),

  reset: () => set({ ...defaultUIState }),
}));
