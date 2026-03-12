'use client'

/**
 * PlaygroundCanvas — layers panel + full-page Sandpack preview.
 *
 * Panel has two modes:
 *  - Section mode (when canvasSections.length > 0): Wix-style hierarchy showing
 *    sections → slots, with slot type badges, eye toggle, swap button.
 *  - Flat mode (fallback): the original draggable flat list of layers.
 *
 * Preview always uses <PageSandpack> with sections passed when available.
 */

import { useCallback, useEffect, useRef } from 'react'
import {
  DndContext,
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
import {
  GripVertical, Trash2, Copy, LayoutGrid, Maximize2, Plus,
  Eye, EyeOff, ArrowLeftRight, Layers,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { REGISTRY_MAP } from '@/src/playground/registry'
import { usePlaygroundStore } from '@/src/stores/playgroundStore'

const PageSandpack = dynamic(
  () => import('./PageSandpack'),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-[#09090B]">
        <div className="w-5 h-5 border-2 border-[#5227FF] border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  }
)

// ── Slot type badge colours ────────────────────────────────────────────────────

const SLOT_COLORS = {
  'background'   : { bg: '#5227FF22', text: '#B17BFF', border: '#5227FF' },
  'hero-headline': { bg: '#F97316/10', text: '#FB923C', border: '#F97316' },
  'hero-sub'     : { bg: '#F97316/10', text: '#FDA460', border: '#F97316' },
  'nav'          : { bg: '#06B6D4/10', text: '#22D3EE', border: '#06B6D4' },
  'cta'          : { bg: '#22C55E/10', text: '#4ADE80', border: '#22C55E' },
  'card-grid'    : { bg: '#06B6D4/10', text: '#22D3EE', border: '#06B6D4' },
  'logo-strip'   : { bg: '#71717A/10', text: '#A1A1AA', border: '#71717A' },
  'feature-text' : { bg: '#F97316/10', text: '#FB923C', border: '#F97316' },
  'counter-row'  : { bg: '#22C55E/10', text: '#4ADE80', border: '#22C55E' },
  'gallery'      : { bg: '#06B6D4/10', text: '#22D3EE', border: '#06B6D4' },
  'free'         : { bg: '#3F3F46/20', text: '#71717A', border: '#52525B' },
}

const SLOT_ABBREV = {
  'background'   : 'BG',
  'hero-headline': 'H1',
  'hero-sub'     : 'H2',
  'nav'          : 'NAV',
  'cta'          : 'CTA',
  'card-grid'    : '□□',
  'logo-strip'   : '≋',
  'feature-text' : 'F',
  'counter-row'  : '#',
  'gallery'      : '▦',
  'free'         : '~',
}

// ── Section slot row ───────────────────────────────────────────────────────────

function SlotRow({ item }) {
  const selectItem       = usePlaygroundStore((s) => s.selectItem)
  const removeItem       = usePlaygroundStore((s) => s.removeItem)
  const toggleVisible    = usePlaygroundStore((s) => s.toggleVisible)
  const openBrowser      = usePlaygroundStore((s) => s.openBrowser)
  const selectedItemId   = usePlaygroundStore((s) => s.selectedItemId)
  const entry            = REGISTRY_MAP[item.componentKey]
  const isSelected       = selectedItemId === item.id
  const isEmpty          = !item.componentKey
  const colors           = SLOT_COLORS[item.slotType] ?? SLOT_COLORS['free']

  return (
    <div
      onClick={() => !isEmpty && selectItem(item.id)}
      className={`
        group flex items-center gap-2 px-3 py-2 cursor-pointer transition-all duration-100
        border-l-2 ml-3
        ${isSelected
          ? 'bg-[#5227FF]/10 border-[#5227FF]'
          : 'border-transparent hover:bg-white/[0.02] hover:border-[#3F3F46]'}
        ${isEmpty ? 'opacity-60' : ''}
      `}
    >
      {/* Slot type badge */}
      <span
        className="text-[9px] font-bold px-1 py-0.5 rounded flex-shrink-0 font-mono"
        style={{ background: `${colors.border}22`, color: colors.text, border: `1px solid ${colors.border}44` }}
      >
        {SLOT_ABBREV[item.slotType] ?? '~'}
      </span>

      {/* Name */}
      {isEmpty ? (
        <span className="text-xs text-[#52525B] flex-1 truncate italic">empty slot</span>
      ) : (
        <span className="text-xs text-[#FAFAFA] flex-1 truncate leading-none">
          {entry?.name ?? item.componentKey}
        </span>
      )}

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Eye toggle */}
        {!isEmpty && (
          <button
            onClick={(e) => { e.stopPropagation(); toggleVisible(item.id) }}
            className="p-1 rounded text-[#52525B] hover:text-[#FAFAFA] hover:bg-white/5"
            title={item.visible === false ? 'Show' : 'Hide'}
          >
            {item.visible === false ? <EyeOff size={11} /> : <Eye size={11} />}
          </button>
        )}

        {/* Swap / fill button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            openBrowser(item.slotType, item.id)
          }}
          className={`p-1 rounded text-[#52525B] hover:bg-white/5 ${
            isEmpty ? 'hover:text-[#5227FF] text-[#5227FF]/60' : 'hover:text-[#FAFAFA]'
          }`}
          title={isEmpty ? 'Fill slot' : 'Swap component'}
        >
          {isEmpty ? <Plus size={11} /> : <ArrowLeftRight size={11} />}
        </button>

        {/* Delete (non-empty only) */}
        {!isEmpty && (
          <button
            onClick={(e) => { e.stopPropagation(); removeItem(item.id) }}
            className="p-1 rounded text-[#52525B] hover:text-red-400 hover:bg-red-900/10"
            title="Remove"
          >
            <Trash2 size={11} />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Section block ─────────────────────────────────────────────────────────────

function SectionBlock({ section, items }) {
  return (
    <div className="border-b border-[#1F1F23] last:border-0">
      {/* Section header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#0D0D0F]">
        <Layers size={11} className="text-[#52525B] flex-shrink-0" />
        <span className="text-[11px] font-semibold text-[#71717A] flex-1 truncate">{section.label}</span>
        <span className="text-[10px] text-[#3F3F46] font-mono">{section.heightVh}vh</span>
      </div>
      {/* Slot rows */}
      {items.length === 0 ? (
        <p className="text-[11px] text-[#3F3F46] px-5 py-2 italic">No slots</p>
      ) : (
        items.map((item) => <SlotRow key={item.id} item={item} />)
      )}
    </div>
  )
}

// ── Flat layer row (used when no sections) ─────────────────────────────────────

const CATEGORY_COLORS = {
  Backgrounds:    '#5227FF',
  Components:     '#06B6D4',
  TextAnimations: '#F97316',
  Animations:     '#22C55E',
}

function SortableLayer({ item }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })

  const selectItem    = usePlaygroundStore((s) => s.selectItem)
  const removeItem    = usePlaygroundStore((s) => s.removeItem)
  const duplicateItem = usePlaygroundStore((s) => s.duplicateItem)
  const setLayoutHint = usePlaygroundStore((s) => s.setLayoutHint)
  const toggleVisible = usePlaygroundStore((s) => s.toggleVisible)
  const selectedItemId = usePlaygroundStore((s) => s.selectedItemId)

  const entry      = REGISTRY_MAP[item.componentKey]
  const isSelected = selectedItemId === item.id
  const dotColor   = CATEGORY_COLORS[entry?.category] ?? '#71717A'

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
        group flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-all duration-100
        border-l-2
        ${isSelected
          ? 'bg-[#5227FF]/10 border-[#5227FF]'
          : 'border-transparent hover:bg-white/[0.03] hover:border-[#3F3F46]'}
        ${item.visible === false ? 'opacity-40' : ''}
      `}
    >
      <button
        {...listeners}
        {...attributes}
        className="text-[#3F3F46] hover:text-[#71717A] cursor-grab active:cursor-grabbing flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={12} />
      </button>
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dotColor }} />
      <span className="text-xs text-[#FAFAFA] flex-1 truncate leading-none">
        {entry?.name ?? item.componentKey}
      </span>
      {item.layoutHint === 'half' && (
        <span className="text-[9px] text-[#52525B] flex-shrink-0 font-mono">½</span>
      )}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); toggleVisible(item.id) }}
          className="p-1 rounded text-[#52525B] hover:text-[#FAFAFA] hover:bg-white/5"
          title={item.visible === false ? 'Show' : 'Hide'}
        >
          {item.visible === false ? <EyeOff size={11} /> : <Eye size={11} />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setLayoutHint(item.id, item.layoutHint === 'full' ? 'half' : 'full') }}
          className="p-1 rounded text-[#52525B] hover:text-[#FAFAFA] hover:bg-white/5"
          title={item.layoutHint === 'full' ? 'Set half width' : 'Set full width'}
        >
          {item.layoutHint === 'full' ? <LayoutGrid size={11} /> : <Maximize2 size={11} />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); duplicateItem(item.id) }}
          className="p-1 rounded text-[#52525B] hover:text-[#FAFAFA] hover:bg-white/5"
          title="Duplicate"
        >
          <Copy size={11} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); removeItem(item.id) }}
          className="p-1 rounded text-[#52525B] hover:text-red-400 hover:bg-red-900/10"
          title="Remove"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyCanvas({ openBrowser }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center bg-[#09090B]">
      <div className="w-16 h-16 rounded-2xl bg-[#111113] border border-[#3F3F46] flex items-center justify-center">
        <Plus size={24} className="text-[#52525B]" />
      </div>
      <div>
        <p className="text-[#A1A1AA] text-sm font-medium">Canvas is empty</p>
        <p className="text-[#52525B] text-xs mt-1">Add components from the browser or let AI pick some</p>
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
  const canvasItems     = usePlaygroundStore((s) => s.canvasItems)
  const canvasSections  = usePlaygroundStore((s) => s.canvasSections)
  const reorderItems    = usePlaygroundStore((s) => s.reorderItems)
  const openBrowser     = usePlaygroundStore((s) => s.openBrowser)
  const isDirty         = usePlaygroundStore((s) => s.isDirty)
  const setLastSaved    = usePlaygroundStore((s) => s.setLastSaved)
  const setIsDirty      = usePlaygroundStore((s) => s.setIsDirty)

  const saveTimer = useRef(null)

  // Persist canvas to API whenever dirty (saves both items and sections)
  useEffect(() => {
    if (!isDirty) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        await fetch('/api/playground', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: canvasItems, sections: canvasSections }),
        })
        setLastSaved(new Date())
      } catch {
        setIsDirty(true)
      }
    }, SAVE_DEBOUNCE_MS)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [isDirty, canvasItems, canvasSections, setLastSaved, setIsDirty])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event
    if (over && active.id !== over.id) reorderItems(String(active.id), String(over.id))
  }, [reorderItems])

  const sortedItems = [...canvasItems].sort((a, b) => a.order - b.order)
  const hasSections = canvasSections.length > 0

  if (canvasItems.length === 0 && !hasSections) {
    return <EmptyCanvas openBrowser={openBrowser} />
  }

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      {/* ── Left: Panel ── */}
      <div className="w-56 flex-shrink-0 flex flex-col bg-[#0A0A0C] border-r border-[#1F1F23] overflow-hidden">
        {/* Header */}
        <div className="px-3 py-2.5 border-b border-[#1F1F23] flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[#52525B] uppercase tracking-wider">
            {hasSections ? 'Sections' : 'Layers'}
          </span>
          <span className="text-[11px] text-[#3F3F46] tabular-nums">
            {hasSections ? canvasSections.length : canvasItems.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#1F1F23]">
          {hasSections ? (
            // ── Section mode ──────────────────────────────────────────────────
            <>
              {[...canvasSections]
                .sort((a, b) => a.order - b.order)
                .map((section) => {
                  const sectionItems = sortedItems.filter((i) => i.sectionId === section.id)
                  return (
                    <SectionBlock key={section.id} section={section} items={sectionItems} />
                  )
                })}
              {/* Orphan items with no section */}
              {(() => {
                const orphans = sortedItems.filter(
                  (i) => !canvasSections.find((s) => s.id === i.sectionId)
                )
                if (orphans.length === 0) return null
                return (
                  <div className="border-t border-[#1F1F23]">
                    <div className="flex items-center gap-2 px-3 py-2 bg-[#0D0D0F]">
                      <span className="text-[11px] font-semibold text-[#52525B]">Free Layer</span>
                    </div>
                    {orphans.map((item) => <SlotRow key={item.id} item={item} />)}
                  </div>
                )
              })()}
            </>
          ) : (
            // ── Flat mode ─────────────────────────────────────────────────────
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sortedItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <div className="py-1">
                  {sortedItems.map((item) => (
                    <SortableLayer key={item.id} item={item} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Add component button */}
        <button
          onClick={() => openBrowser()}
          className="flex items-center justify-center gap-1.5 mx-3 mb-3 mt-1 py-2 rounded-lg border border-dashed border-[#2A2A2E] text-[#52525B] hover:text-[#A1A1AA] hover:border-[#5227FF]/40 text-xs transition-all"
        >
          <Plus size={12} />
          Add component
        </button>
      </div>

      {/* ── Right: Sandpack preview ── */}
      <PageSandpack items={sortedItems} sections={canvasSections} />
    </div>
  )
}
