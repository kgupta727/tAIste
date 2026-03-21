'use client'

/**
 * ComponentBrowser — slide-over panel showing all approved ReactBits components
 * organised into 5 collapsible sections that match APPROVED_COMPONENTS exactly.
 *
 * Swap mode: only the category matching the component being replaced is shown.
 *   A text component can only swap with another text component.
 *   A card with a card. Never cross-category.
 *
 * Browse mode: all 5 sections visible.
 *
 * Expanding the component set in future = only add to APPROVED_COMPONENTS in
 * componentMap.ts. This panel updates automatically.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, ChevronRight, X, ArrowLeftRight } from 'lucide-react'
import { APPROVED_COMPONENTS, getCategory } from '@/src/playground/componentMap'
import { usePlaygroundStore } from '@/src/stores/playgroundStore'

// ── Category display config ────────────────────────────────────────────────────

const CATEGORY_LABELS = {
  backgrounds : 'Backgrounds',
  text        : 'Text Effects',
  cards       : 'Cards',
  animations  : 'Animations',
  supporters  : 'Supporters',
}

const CATEGORY_COLORS = {
  backgrounds : '#5227FF',
  text        : '#06B6D4',
  cards       : '#F59E0B',
  animations  : '#10B981',
  supporters  : '#EC4899',
}

// ── Component card ────────────────────────────────────────────────────────────

function ComponentCard({ name, category }) {
  const replacingComponent = usePlaygroundStore((s) => s.replacingComponent)
  const replaceComponent   = usePlaygroundStore((s) => s.replaceComponent)
  const closeBrowser       = usePlaygroundStore((s) => s.closeBrowser)
  const isSwapMode         = !!replacingComponent

  return (
    <div
      className={`
        group flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all duration-150
        bg-[#111113] border-[#3F3F46]
        hover:border-[#5227FF]/60 hover:bg-[#5227FF]/5
      `}
      onClick={() => {
        if (isSwapMode) {
          replaceComponent(replacingComponent, name)
          closeBrowser()
        }
      }}
    >
      {/* Category dot */}
      <div
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: CATEGORY_COLORS[category] }}
      />

      {/* Name */}
      <span className="text-sm text-[#FAFAFA] flex-1 truncate font-medium">{name}</span>

      {/* Action badge */}
      {isSwapMode ? (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-[#5227FF]/20 text-[#B17BFF] border border-[#5227FF]/30 opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowLeftRight size={9} />
          Swap
        </span>
      ) : (
        <span
          className="px-1.5 py-0.5 text-[10px] rounded bg-[#1A1A1F] text-[#71717A] border border-[#3F3F46] opacity-60"
          style={{ color: CATEGORY_COLORS[category] }}
        >
          {CATEGORY_LABELS[category]}
        </span>
      )}
    </div>
  )
}

// ── Collapsible section ───────────────────────────────────────────────────────

function CategorySection({ categoryKey, replacingCategory }) {
  const [isOpen, setIsOpen] = useState(true)
  const components = APPROVED_COMPONENTS[categoryKey]
  const label      = CATEGORY_LABELS[categoryKey]
  const color      = CATEGORY_COLORS[categoryKey]

  // In swap mode: hide sections that don't match the replacing component's category
  const isSwapMode = !!replacingCategory
  if (isSwapMode && replacingCategory !== categoryKey) return null

  return (
    <div className="border-b border-[#1F1F23] last:border-0">
      {/* Section header */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-[#0D0D0F] hover:bg-[#111113] transition-colors"
      >
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
        <span className="text-[10px] font-semibold text-[#71717A] uppercase tracking-wider flex-1 text-left">
          {label}
        </span>
        <span className="text-[10px] text-[#3F3F46] tabular-nums">{components.length}</span>
        {isOpen
          ? <ChevronDown size={10} className="text-[#52525B]" />
          : <ChevronRight size={10} className="text-[#52525B]" />
        }
      </button>

      {/* Component list */}
      {isOpen && (
        <div className="px-2 pb-2 pt-1 space-y-1.5">
          {components.map((name) => (
            <ComponentCard key={name} name={name} category={categoryKey} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function ComponentBrowser() {
  const closeBrowser       = usePlaygroundStore((s) => s.closeBrowser)
  const replacingComponent = usePlaygroundStore((s) => s.replacingComponent)

  // Determine which category is being swapped (filters visible sections)
  const replacingCategory = replacingComponent ? getCategory(replacingComponent) : null

  const title = replacingComponent
    ? `Swap ${replacingComponent}`
    : 'Browse Components'

  const subtitle = replacingComponent
    ? replacingCategory
      ? `Showing ${CATEGORY_LABELS[replacingCategory]} only`
      : 'All categories'
    : `${Object.values(APPROVED_COMPONENTS).flat().length} components`

  return (
    <motion.div
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="flex flex-col h-full w-64 bg-[#0E0E10] border-r border-[#3F3F46] overflow-hidden flex-shrink-0"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#3F3F46]">
        <div>
          <p className="text-sm font-semibold text-[#FAFAFA]">{title}</p>
          <p className="text-[10px] text-[#52525B] mt-0.5">{subtitle}</p>
        </div>
        <button
          onClick={closeBrowser}
          className="text-[#71717A] hover:text-[#FAFAFA] transition-colors p-1"
          aria-label="Close browser"
        >
          <X size={16} />
        </button>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#3F3F46]">
        {(Object.keys(APPROVED_COMPONENTS) ).map((cat) => (
          <CategorySection
            key={cat}
            categoryKey={cat}
            replacingCategory={replacingCategory}
          />
        ))}
      </div>
    </motion.div>
  )
}
