import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;
  language: string;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setLanguage: (lang: string) => void;
}

export const useUiStore = create<UIState>()((set) => ({
  sidebarOpen: true,
  language: localStorage.getItem("language") || "fr",

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),

  setLanguage: (lang: string) => {
    localStorage.setItem("language", lang);
    set({ language: lang });
  },
}));

/**
 * Coordinates language change across i18n and the UI store.
 * Accepts the i18n instance from the calling context (test-safe — avoids
 * importing the global i18n singleton which differs from the test provider instance).
 */
export function changeAppLanguage(
  i18nInstance: { changeLanguage: (lang: string) => Promise<unknown> },
  lang: string
) {
  i18nInstance.changeLanguage(lang);
  useUiStore.getState().setLanguage(lang);
}
