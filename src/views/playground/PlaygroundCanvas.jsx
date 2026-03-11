'use client'

/**
 * PlaygroundCanvas — the central drag-to-reorder canvas.
 * Each added component is rendered via SandpackPreview in a SortableContext.
 */

import { useCallback, useEffect, useRef } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AnimatePresence, motion } from 'framer-motion'
import { GripVertical, Trash2, Copy, LayoutGrid, Maximize2, Plus } from 'lucide-react'
import dynamic from 'next/dynamic'
import { REGISTRY_MAP } from '@/src/playground/registry'
import { usePlaygroundStore } from '@/src/stores/playgroundStore'

// Lazy-load Sandpack so the initial page renders fast
const SandpackPreview = dynamic(
  () => import('./SandpackPreview'),
  { ssr: false, loading: () => <div className="h-80 bg-[#09090B] rounded-lg border border-[#3F3F46] animate-pulse" /> }
)

// ── Sortable item wrapper ──────────────────────────────────────────────────────

function SortableSection({ item }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })
  const selectItem = usePlaygroundStore((s) => s.selectItem)
  const selectedItemId = usePlaygroundStore((s) => s.selectedItemId)
  const removeItem = usePlaygroundStore((s) => s.removeItem)
  const duplicateItem = usePlaygroundStore((s) => s.duplicateItem)
  const setLayoutHint = usePlaygroundStore((s) => s.setLayoutHint)

  const entry = REGISTRY_MAP[item.componentKey]
  const isSelected = selectedItemId === item.id

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => selectItem(item.id)}
      className={`
        group relative rounded-xl border transition-all duration-150 overflow-hidden
        ${isSelected
          ? 'border-[#5227FF] ring-1 ring-[#5227FF]/40'
          : 'border-[#3F3F46] hover:border-[#5227FF]/40'}
        ${item.layoutHint === 'half' ? 'w-[49%]' : 'w-full'}
      `}
    >
      {/* Drag handle + actions overlay */}
      <div className={`
        absolute top-0 left-0 right-0 px-3 py-2 flex items-center justify-between
        bg-gradient-to-b from-[#0E0E10]/90 to-transparent z-10
        opacity-0 group-hover:opacity-100 transition-opacity duration-150
      `}>
        <div className="flex items-center gap-1.5">
          <button
            {...listeners}
            {...attributes}
            className="text-[#71717A] hover:text-[#FAFAFA] cursor-grab active:cursor-grabbing p-1 rounded"
            aria-label="Drag to reorder"
          >
            <GripVertical size={14} />
          </button>
          <span className="text-xs text-[#A1A1AA] font-medium">{entry?.name || item.componentKey}</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Toggle half/full width */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setLayoutHint(item.id, item.layoutHint === 'full' ? 'half' : 'full')
            }}
            className="p-1 rounded text-[#71717A] hover:text-[#FAFAFA] hover:bg-white/5 transition-colors"
            title={item.layoutHint === 'full' ? 'Set half width' : 'Set full width'}
          >
            {item.layoutHint === 'full' ? <LayoutGrid size={13} /> : <Maximize2 size={13} />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); duplicateItem(item.id) }}
            className="p-1 rounded text-[#71717A] hover:text-[#FAFAFA] hover:bg-white/5 transition-colors"
            title="Duplicate"
          >
            <Copy size={13} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); removeItem(item.id) }}
            className="p-1 rounded text-[#71717A] hover:text-red-400 hover:bg-red-900/10 transition-colors"
            title="Remove"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Preview */}
      {entry ? (
        <SandpackPreview
          entry={entry}
          props={item.props}
          height={item.layoutHint === 'half' ? 240 : 320}
        />
      ) : (
        <div className="h-40 flex items-center justify-center text-xs text-[#71717A]">
          Unknown component: {item.componentKey}
        </div>
      )}
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyCanvas() {
  const openBrowser = usePlaygroundStore((s) => s.openBrowser)
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#111113] border border-[#3F3F46] flex items-center justify-center">
        <Plus size={24} className="text-[#52525B]" />
      </div>
      <div>
        <p className="text-[#A1A1AA] text-sm font-medium">Canvas is empty</p>
        <p className="text-[#52525B] text-xs mt-1">
          Add components from the browser or let AI recommend some
        </p>
      </div>
      <button
        onClick={openBrowser}
        className="px-4 py-2 rounded-lg bg-[#5227FF] text-white text-sm font-medium hover:bg-[#6B3FFF] transition-colors"
      >
        Browse Components
      </button>
    </div>
  )
}

// ── PlaygroundCanvas ───────────────────────────────────────────────────────────

const SAVE_DEBOUNCE_MS = 1000

export default function PlaygroundCanvas() {
  const canvasItems = usePlaygroundStore((s) => s.canvasItems)
  const reorderItems = usePlaygroundStore((s) => s.reorderItems)
  const isDirty = usePlaygroundStore((s) => s.isDirty)
  const setLastSaved = usePlaygroundStore((s) => s.setLastSaved)
  const setIsDirty = usePlaygroundStore((s) => s.setIsDirty)

  const saveTimer = useRef(null)

  // Persist to API whenever canvas is dirty
  useEffect(() => {
    if (!isDirty) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        await fetch('/api/playground', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: canvasItems }),
        })
        setLastSaved(new Date())
      } catch {
        // Silently fail — user's next change will retry
        setIsDirty(true)
      }
    }, SAVE_DEBOUNCE_MS)

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [isDirty, canvasItems, setLastSaved, setIsDirty])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event
      if (over && active.id !== over.id) {
        reorderItems(String(active.id), String(over.id))
      }
    },
    [reorderItems]
  )

  const sortedItems = [...canvasItems].sort((a, b) => a.order - b.order)

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#09090B] p-4 gap-3">
      {canvasItems.length === 0 ? (
        <EmptyCanvas />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedItems.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-3">
              <AnimatePresence initial={false}>
                {sortedItems.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <SortableSection item={item} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
