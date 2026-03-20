import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export type LayoutHint = 'full' | 'half'

// ── Slot / section model ───────────────────────────────────────────────────────

/**
 * SlotType describes what role a canvas item plays in the layout.
 * 'background' items always fill their section absolutely (z:0).
 * All others are positioned relative to their section using slotPosition.
 */
export type SlotType =
  | 'background'
  | 'hero-headline'
  | 'hero-sub'
  | 'nav'
  | 'cta'
  | 'card-grid'
  | 'logo-strip'
  | 'feature-text'
  | 'counter-row'
  | 'gallery'
  | 'hero-accent'   // inline accent below hero CTA buttons
  | 'free'          // manually added — no fixed slot position

/** CSS position values for a slot within its section */
export interface SlotPosition {
  top?: string
  bottom?: string
  left?: string
  right?: string
  width?: string
  transform?: string
  textAlign?: 'left' | 'center' | 'right'
}

/** Section definition — one viewport-height block in the page */
export interface CanvasSection {
  id: string
  templateSlotId: string | null   // which template slot this originated from (null = custom)
  label: string                   // display name e.g. "Section 1"
  heightVh: number                // section height in vh units
  order: number                   // determines scroll position
  // Scaffold content populated by fill-template AI from brand DNA
  brandName?: string              // shown in the nav bar
  subtitle?: string               // plain HTML subtitle paragraph below headline
  ctaPrimary?: string             // primary CTA button text
  ctaSecondary?: string           // secondary CTA button text
  // Brand identity — extracted from user's Brand DNA by fill-template API
  brandPrimary?: string           // dominant primary color hex e.g. "#1A1A2E"
  brandAccent?: string            // accent color hex e.g. "#E94560" — used for CTAs, highlights
  brandBg?: string                // page background hex e.g. "#09090B"
  brandFontHeading?: string       // heading font family e.g. "Playfair Display"
  brandFontBody?: string          // body font family e.g. "Inter"
}

export interface CanvasItem {
  id: string
  componentKey: string
  props: Record<string, unknown>
  order: number
  layoutHint: LayoutHint          // kept for export compat
  // slot fields
  sectionId: string               // which section this item belongs to
  slotType: SlotType
  slotPosition: SlotPosition      // CSS absolute position within the section
  visible: boolean
}

// ── Default slot positions (used by templates + AI fill) ──────────────────────

export const DEFAULT_SLOT_POSITIONS: Record<SlotType, SlotPosition> = {
  'background'    : { top: '0', left: '0', width: '100%' },
  'hero-headline' : { bottom: '18%', left: '7%', width: '70%', textAlign: 'left' },
  'hero-sub'      : { bottom: '11%', left: '7%', width: '60%', textAlign: 'left' },
  'nav'           : { top: '3%', left: '0', width: '100%' },
  'cta'           : { bottom: '6%', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' },
  'card-grid'     : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '90%' },
  'logo-strip'    : { bottom: '4%', left: '0', width: '100%' },
  'feature-text'  : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80%', textAlign: 'center' },
  'counter-row'   : { bottom: '8%', left: '50%', transform: 'translateX(-50%)', width: '80%' },
  'gallery'       : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '95%' },
  'hero-accent'   : { bottom: '12%', left: '50%', transform: 'translateX(-50%)', width: '60%' },
  'free'          : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80%', textAlign: 'center' },
}

// ── Component categories that are compatible with each slot type ──────────────

export const SLOT_CATEGORY_HINTS: Record<SlotType, string[]> = {
  'background'    : ['Backgrounds'],
  'hero-headline' : ['TextAnimations'],
  'hero-sub'      : ['TextAnimations'],
  'nav'           : ['Components', 'Animations'],
  'cta'           : ['Components', 'Animations'],
  'card-grid'     : ['Components'],
  'logo-strip'    : ['Animations', 'Components'],
  'feature-text'  : ['TextAnimations'],
  'counter-row'   : ['Components', 'TextAnimations'],
  'gallery'       : ['Components'],
  'hero-accent'   : ['Animations', 'Components'],
  'free'          : ['Backgrounds', 'TextAnimations', 'Animations', 'Components'],
}

// ── Snapshot model ────────────────────────────────────────────────────────────

export interface CanvasSnapshot {
  id: string
  label: string
  templateId: string | null
  createdAt: string
  items: CanvasItem[]
  sections: CanvasSection[]
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface PlaygroundState {
  // canvas
  canvasItems: CanvasItem[]
  canvasSections: CanvasSection[]
  selectedItemId: string | null
  activeTemplateId: string | null
  // ui state
  isBrowserOpen: boolean
  browserSlotFilter: SlotType | null  // when opened from a slot swap button
  pendingSwapSlotId: string | null    // which slot item the browser is swapping into
  isRecommending: boolean
  isFilling: boolean                  // AI is filling template slots
  isDirty: boolean
  lastSaved: Date | null
  // snapshots
  snapshots: CanvasSnapshot[]
  snapshotsLoading: boolean

  // canvas actions
  addItem: (item: Omit<CanvasItem, 'order'>) => void
  removeItem: (id: string) => void
  duplicateItem: (id: string) => void
  updateItemProps: (id: string, props: Record<string, unknown>) => void
  reorderItems: (activeId: string, overId: string) => void
  setLayoutHint: (id: string, hint: LayoutHint) => void
  setCanvasItems: (items: CanvasItem[]) => void
  setCanvasSections: (sections: CanvasSection[]) => void
  toggleVisible: (id: string) => void
  swapSlotComponent: (slotItemId: string, newComponentKey: string, newProps: Record<string, unknown>) => void

  // template
  setActiveTemplate: (id: string | null) => void
  applyTemplateFill: (fills: { slotId: string; componentKey: string; props: Record<string, unknown> }[]) => void

  // selection
  selectItem: (id: string | null) => void

  // ui
  openBrowser: (slotFilter?: SlotType | null, pendingSwapSlotId?: string | null) => void
  closeBrowser: () => void
  setIsRecommending: (v: boolean) => void
  setIsFilling: (v: boolean) => void
  setLastSaved: (d: Date) => void
  setIsDirty: (v: boolean) => void

  // snapshots
  fetchSnapshots: () => Promise<void>
  saveSnapshot: (label?: string, templateId?: string) => Promise<void>
  restoreSnapshot: (snapshot: CanvasSnapshot) => void
  deleteSnapshot: (id: string) => Promise<void>
}

export const usePlaygroundStore = create<PlaygroundState>()(
  devtools(
    (set, get) => ({
      canvasItems: [],
      canvasSections: [],
      selectedItemId: null,
      activeTemplateId: null,
      isBrowserOpen: false,
      browserSlotFilter: null,
      pendingSwapSlotId: null,
      isRecommending: false,
      isFilling: false,
      isDirty: false,
      lastSaved: null,
      snapshots: [],
      snapshotsLoading: false,

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
            slotType: 'free',
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

      setCanvasSections: (sections) =>
        set({ canvasSections: sections, isDirty: false }),

      toggleVisible: (id) =>
        set((s) => ({
          canvasItems: s.canvasItems.map((i) =>
            i.id === id ? { ...i, visible: !i.visible } : i
          ),
          isDirty: true,
        })),

      swapSlotComponent: (slotItemId, newComponentKey, newProps) =>
        set((s) => ({
          canvasItems: s.canvasItems.map((i) =>
            i.id === slotItemId
              ? { ...i, componentKey: newComponentKey, props: newProps }
              : i
          ),
          isDirty: true,
        })),

      setActiveTemplate: (id) => set({ activeTemplateId: id }),

      applyTemplateFill: (fills) =>
        set((s) => {
          const updated = [...s.canvasItems]
          for (const fill of fills) {
            const idx = updated.findIndex((i) => i.id === fill.slotId)
            if (idx !== -1) {
              updated[idx] = { ...updated[idx], componentKey: fill.componentKey, props: fill.props }
            }
          }
          return { canvasItems: updated, isDirty: true }
        }),

      selectItem: (id) => set({ selectedItemId: id }),

      openBrowser: (slotFilter = null, pendingSwapSlotId = null) =>
        set({ isBrowserOpen: true, browserSlotFilter: slotFilter, pendingSwapSlotId }),
      closeBrowser: () => set({ isBrowserOpen: false, browserSlotFilter: null, pendingSwapSlotId: null }),
      setIsRecommending: (v) => set({ isRecommending: v }),
      setIsFilling: (v) => set({ isFilling: v }),
      setLastSaved: (d) => set({ lastSaved: d, isDirty: false }),
      setIsDirty: (v) => set({ isDirty: v }),

      fetchSnapshots: async () => {
        set({ snapshotsLoading: true })
        try {
          const res = await fetch('/api/playground/snapshots')
          if (!res.ok) return
          const json = await res.json()
          const rows: Array<{ id: string; label: string; template_id: string | null; created_at: string; items: CanvasItem[]; sections: CanvasSection[] }> = json.snapshots ?? []
          set({
            snapshots: rows.map((r) => ({
              id: r.id,
              label: r.label,
              templateId: r.template_id,
              createdAt: r.created_at,
              items: r.items,
              sections: r.sections,
            })),
          })
        } finally {
          set({ snapshotsLoading: false })
        }
      },

      saveSnapshot: async (label, templateId) => {
        const { canvasItems, canvasSections } = get()
        if (canvasItems.length === 0) return
        const res = await fetch('/api/playground/snapshots', {
          method : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body   : JSON.stringify({
            label     : label ?? `Snapshot ${new Date().toLocaleTimeString()}`,
            templateId: templateId ?? null,
            items     : canvasItems,
            sections  : canvasSections,
          }),
        })
        if (!res.ok) return
        const json = await res.json()
        const r = json.snapshot
        if (r) {
          set((s) => ({
            snapshots: [
              {
                id: r.id,
                label: r.label,
                templateId: r.template_id ?? null,
                createdAt: r.created_at,
                items: canvasItems,
                sections: canvasSections,
              },
              ...s.snapshots,
            ].slice(0, 20),
          }))
        }
      },

      restoreSnapshot: (snapshot) => {
        set({
          canvasItems    : snapshot.items,
          canvasSections : snapshot.sections,
          selectedItemId : null,
          isDirty        : true,
        })
      },

      deleteSnapshot: async (id) => {
        set((s) => ({ snapshots: s.snapshots.filter((sn) => sn.id !== id) }))
        await fetch(`/api/playground/snapshots?id=${id}`, { method: 'DELETE' })
      },
    }),
    { name: 'playground' }
  )
)
