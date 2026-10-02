import { create } from 'zustand';

interface UIStore {
  activeView: string;
  activeTypeCategory: string | null;
  activeCategory: number | null;
  setActiveView: (view: string) => void;
  setActiveTypeCategory: (type: string | null) => void;
  setActiveCategory: (category: number | null) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  activeView: 'vault',
  activeTypeCategory: 'all',
  activeCategory: null,
  setActiveView: (view) => set({ activeView: view }),
  setActiveTypeCategory: (type) => set({ activeTypeCategory: type }),
  setActiveCategory: (category) => set({ activeCategory: category }),
}));