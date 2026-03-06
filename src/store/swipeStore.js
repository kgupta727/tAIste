import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Swipe store now holds UI-only state.
// Inspirations live in the DB and are fetched via useInspirations().
export const useSwipeStore = create(
  persist(
    (set) => ({
      selectedTags: [],
      searchQuery: '',
      sortBy: 'date',
      viewMode: 'grid',

      toggleTag: (tag) =>
        set((state) => ({
          selectedTags: state.selectedTags.includes(tag)
            ? state.selectedTags.filter((t) => t !== tag)
            : [...state.selectedTags, tag],
        })),

      clearTags: () => set({ selectedTags: [] }),
      setSearch: (query) => set({ searchQuery: query }),
      setSortBy: (sortBy) => set({ sortBy }),
      setViewMode: (viewMode) => set({ viewMode }),
    }),
    {
      name: 'tastestack-swipe',
      partialize: (state) => ({
        viewMode: state.viewMode,
        sortBy: state.sortBy,
      }),
    }
  )
)
