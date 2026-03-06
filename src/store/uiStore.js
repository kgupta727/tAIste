import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useUIStore = create(
  persist(
    (set) => ({
      saveModalOpen: false,
      sidebarCollapsed: false,
      activeExportFormat: 'claude',

      openSaveModal: () => set({ saveModalOpen: true }),
      closeSaveModal: () => set({ saveModalOpen: false }),

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

      setActiveExportFormat: (id) => set({ activeExportFormat: id }),
    }),
    {
      name: 'tastestack-ui',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        activeExportFormat: state.activeExportFormat,
      }),
    }
  )
)
