import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export type LayoutHint = 'full' | 'half'

export interface CanvasItem {
  id: string
  componentKey: string
  props: Record<string, unknown>
  order: number
  layoutHint: LayoutHint
}

interface PlaygroundState {
  // canvas
  canvasItems: CanvasItem[]
  selectedItemId: string | null
  // ui state
  isBrowserOpen: boolean
  isRecommending: boolean
  isDirty: boolean
  lastSaved: Date | null

  // canvas actions
  addItem: (item: Omit<CanvasItem, 'order'>) => void
  removeItem: (id: string) => void
  duplicateItem: (id: string) => void
  updateItemProps: (id: string, props: Record<string, unknown>) => void
  reorderItems: (activeId: string, overId: string) => void
  setLayoutHint: (id: string, hint: LayoutHint) => void
  setCanvasItems: (items: CanvasItem[]) => void

  // selection
  selectItem: (id: string | null) => void

  // ui
  openBrowser: () => void
  closeBrowser: () => void
  setIsRecommending: (v: boolean) => void
  setLastSaved: (d: Date) => void
  setIsDirty: (v: boolean) => void
}

export const usePlaygroundStore = create<PlaygroundState>()(
  devtools(
    (set, get) => ({
      canvasItems: [],
      selectedItemId: null,
      isBrowserOpen: false,
      isRecommending: false,
      isDirty: false,
      lastSaved: null,

      addItem: (item) =>
        set((s) => {
          const order = s.canvasItems.length
          return {
            canvasItems: [...s.canvasItems, { ...item, order }],
            selectedItemId: item.id,
            isDirty: true,
          }
        }),

      removeItem: (id) =>
        set((s) => ({
          canvasItems: s.canvasItems
            .filter((i) => i.id !== id)
            .map((i, idx) => ({ ...i, order: idx })),
          selectedItemId: s.selectedItemId === id ? null : s.selectedItemId,
          isDirty: true,
        })),

      duplicateItem: (id) =>
        set((s) => {
          const src = s.canvasItems.find((i) => i.id === id)
          if (!src) return s
          const newItem: CanvasItem = {
            ...src,
            id: crypto.randomUUID(),
            order: s.canvasItems.length,
          }
          return {
            canvasItems: [...s.canvasItems, newItem],
            selectedItemId: newItem.id,
            isDirty: true,
          }
        }),

      updateItemProps: (id, props) =>
        set((s) => ({
          canvasItems: s.canvasItems.map((i) =>
            i.id === id ? { ...i, props: { ...i.props, ...props } } : i
          ),
          isDirty: true,
        })),

      reorderItems: (activeId, overId) =>
        set((s) => {
          const items = [...s.canvasItems]
          const from = items.findIndex((i) => i.id === activeId)
          const to = items.findIndex((i) => i.id === overId)
          if (from === -1 || to === -1) return s
          const [moved] = items.splice(from, 1)
          items.splice(to, 0, moved)
          return {
            canvasItems: items.map((i, idx) => ({ ...i, order: idx })),
            isDirty: true,
          }
        }),

      setLayoutHint: (id, hint) =>
        set((s) => ({
          canvasItems: s.canvasItems.map((i) =>
            i.id === id ? { ...i, layoutHint: hint } : i
          ),
          isDirty: true,
        })),

      setCanvasItems: (items) =>
        set({ canvasItems: items, isDirty: false }),

      selectItem: (id) => set({ selectedItemId: id }),

      openBrowser: () => set({ isBrowserOpen: true }),
      closeBrowser: () => set({ isBrowserOpen: false }),
      setIsRecommending: (v) => set({ isRecommending: v }),
      setLastSaved: (d) => set({ lastSaved: d, isDirty: false }),
      setIsDirty: (v) => set({ isDirty: v }),
    }),
    { name: 'playground' }
  )
)
