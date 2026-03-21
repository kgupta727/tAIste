import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { parseUsedComponents, BACKGROUND_COMPONENTS } from '@/src/playground/componentMap'

// ── Generated page model ───────────────────────────────────────────────────────

export interface ContentJSON {
  companyName: string
  heroHeadline: string
  heroSubtitle: string
  ctaPrimary: string
  ctaSecondary: string
  eyebrow: string
  features: Array<{ icon: string; title: string; desc: string }>
  stats: Array<{ value: number; suffix: string; label: string }>
  logoLoop: string
  closingHeadline?: string
  closingSubtitle?: string
}

export interface GeneratedPage {
  jsx: string
  backgroundComponent: string   // rendered at root level, never inside JSX
  content: ContentJSON
  heroImageUrl: string
  usedComponents: string[]      // content components only — no backgrounds
  brandDnaName?: string
}

// ── Snapshot model ────────────────────────────────────────────────────────────

export interface CanvasSnapshot {
  id: string
  label: string
  templateId: string | null
  createdAt: string
  items: unknown[]
  sections: unknown[]
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface PlaygroundState {
  generatedPage: GeneratedPage | null
  isGenerating: boolean
  generateError: string | null
  generateStep: string | null
  isSwapping: boolean

  isBrowserOpen: boolean
  replacingComponent: string | null

  isDirty: boolean
  lastSaved: Date | null

  snapshots: CanvasSnapshot[]
  snapshotsLoading: boolean

  // ── Actions ─────────────────────────────────────────────────────────────────

  setGeneratedPage: (page: GeneratedPage) => void
  setIsGenerating: (v: boolean) => void
  setGenerateError: (e: string | null) => void
  setGenerateStep: (s: string | null) => void

  replaceComponent: (oldName: string, newName: string) => Promise<void>

  openBrowser: (replacingComponent?: string | null) => void
  closeBrowser: () => void

  setIsDirty: (v: boolean) => void
  setLastSaved: (d: Date) => void

  fetchSnapshots: () => Promise<void>
  saveSnapshot: (label?: string) => Promise<void>
  restoreSnapshot: (snapshot: CanvasSnapshot) => void
  deleteSnapshot: (id: string) => Promise<void>
}

export const usePlaygroundStore = create<PlaygroundState>()(
  devtools(
    (set, get) => ({
      generatedPage    : null,
      isGenerating     : false,
      generateError    : null,
      generateStep     : null,
      isSwapping       : false,
      isBrowserOpen    : false,
      replacingComponent: null,
      isDirty          : false,
      lastSaved        : null,
      snapshots        : [],
      snapshotsLoading : false,

      setGeneratedPage: (page) => set({ generatedPage: page, isDirty: true }),
      setIsGenerating:  (v)    => set({ isGenerating: v }),
      setGenerateError: (e)    => set({ generateError: e }),
      setGenerateStep:  (s)    => set({ generateStep: s }),

      replaceComponent: async (oldName, newName) => {
        const page = get().generatedPage
        if (!page) return

        // Background swap: just update the field, no JSX manipulation, no API call
        if (BACKGROUND_COMPONENTS.has(oldName)) {
          set({
            generatedPage: { ...page, backgroundComponent: newName },
            isDirty: true,
          })
          return
        }

        // Content swap: targeted GPT-4o-mini regeneration of the single component
        set({ isSwapping: true })
        try {
          const res = await fetch('/api/playground/swap', {
            method : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body   : JSON.stringify({
              currentComponent: oldName,
              newComponent    : newName,
              pageJsx         : page.jsx,
              content         : page.content,
            }),
          })
          const json = await res.json()
          if (!res.ok) return

          const newJsx  = json.jsx as string
          const newUsed = (json.usedComponents as string[]) ?? parseUsedComponents(newJsx)
          set({
            generatedPage: { ...page, jsx: newJsx, usedComponents: newUsed },
            isDirty: true,
          })
        } finally {
          set({ isSwapping: false })
        }
      },

      openBrowser: (replacingComponent = null) =>
        set({ isBrowserOpen: true, replacingComponent }),
      closeBrowser: () =>
        set({ isBrowserOpen: false, replacingComponent: null }),

      setIsDirty:   (v) => set({ isDirty: v }),
      setLastSaved: (d) => set({ lastSaved: d, isDirty: false }),

      // ── Snapshots ─────────────────────────────────────────────────────────────

      fetchSnapshots: async () => {
        set({ snapshotsLoading: true })
        try {
          const res = await fetch('/api/playground/snapshots')
          if (!res.ok) return
          const json = await res.json()
          const rows: Array<{
            id: string; label: string; template_id: string | null
            created_at: string; items: unknown[]; sections: unknown[]
          }> = json.snapshots ?? []
          set({
            snapshots: rows.map((r) => ({
              id        : r.id,
              label     : r.label,
              templateId: r.template_id,
              createdAt : r.created_at,
              items     : r.items,
              sections  : r.sections,
            })),
          })
        } finally {
          set({ snapshotsLoading: false })
        }
      },

      saveSnapshot: async (label) => {
        const { generatedPage } = get()
        if (!generatedPage) return
        const payload = {
          label    : label ?? `Snapshot ${new Date().toLocaleTimeString()}`,
          templateId: null,
          items    : [{ ...generatedPage }],
          sections : [],
        }
        const res = await fetch('/api/playground/snapshots', {
          method : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body   : JSON.stringify(payload),
        })
        if (!res.ok) return
        const json = await res.json()
        const r = json.snapshot
        if (r) {
          set((s) => ({
            snapshots: [
              {
                id        : r.id,
                label     : r.label,
                templateId: r.template_id ?? null,
                createdAt : r.created_at,
                items     : [{ ...generatedPage }],
                sections  : [],
              },
              ...s.snapshots,
            ].slice(0, 20),
          }))
        }
      },

      restoreSnapshot: (snapshot) => {
        const packed = snapshot.items?.[0] as GeneratedPage | undefined
        if (!packed?.jsx) return
        set({
          generatedPage: {
            ...packed,
            backgroundComponent: packed.backgroundComponent ?? 'Particles',
          },
          isDirty: true,
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
