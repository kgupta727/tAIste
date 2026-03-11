'use client'

/**
 * ComponentBrowser — left panel slide-over showing all ReactBits components
 * organised by category, filterable by search, draggable onto the canvas.
 */

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, GripVertical } from 'lucide-react'
import { useDraggable } from '@dnd-kit/core'
import { REGISTRY, CATEGORY_ORDER } from '@/src/playground/registry'
import { usePlaygroundStore } from '@/src/stores/playgroundStore'

// ── Draggable card ─────────────────────────────────────────────────────────────

function ComponentCard({ entry }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `browser:${entry.key}`,
    data: { componentKey: entry.key, source: 'browser' },
  })
  const addItem = usePlaygroundStore((s) => s.addItem)

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`
        group relative flex items-start gap-3 p-3 rounded-lg border cursor-grab active:cursor-grabbing
        bg-[#111113] border-[#3F3F46] hover:border-[#5227FF]/60 transition-all duration-150
        ${isDragging ? 'opacity-40 scale-95' : ''}
      `}
      // Clicking adds to canvas directly (no drag required)
      onClick={() => {
        const entry2 = REGISTRY.find(c => c.key === entry.key)
        if (!entry2) return
        const defaults = entry2.propSchema.reduce((acc, p) => {
          acc[p.key] = p.default
          return acc
        }, {})
        addItem({
          id: crypto.randomUUID(),
          componentKey: entry.key,
          props: defaults,
          layoutHint: 'full',
        })
      }}
    >
      <GripVertical size={14} className="text-[#71717A] mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[#FAFAFA] truncate">{entry.name}</p>
        <p className="text-xs text-[#71717A] mt-0.5 line-clamp-2 leading-relaxed">{entry.description}</p>
        <span className="inline-block mt-1.5 px-1.5 py-0.5 text-[10px] rounded bg-[#1A1A1F] text-[#A1A1AA] border border-[#3F3F46]">
          {entry.category}
        </span>
      </div>
    </div>
  )
}

// ── Main panel ─────────────────────────────────────────────────────────────────

export default function ComponentBrowser() {
  const closeBrowser = usePlaygroundStore((s) => s.closeBrowser)
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')

  const categories = ['all', ...CATEGORY_ORDER]

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return REGISTRY.filter((c) => {
      const matchCat = activeCategory === 'all' || c.category === activeCategory
      if (!matchCat) return false
      if (!q) return true
      return (
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.tags.some((t) => t.includes(q))
      )
    })
  }, [query, activeCategory])

  return (
    <motion.div
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="flex flex-col h-full w-72 bg-[#0E0E10] border-r border-[#3F3F46] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#3F3F46]">
        <span className="text-sm font-semibold text-[#FAFAFA]">Components</span>
        <button
          onClick={closeBrowser}
          className="text-[#71717A] hover:text-[#FAFAFA] transition-colors"
          aria-label="Close browser"
        >
          <X size={16} />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-[#111113] border border-[#3F3F46] rounded-lg">
          <Search size={13} className="text-[#71717A] flex-shrink-0" />
          <input
            className="flex-1 bg-transparent text-sm text-[#FAFAFA] placeholder-[#52525B] outline-none"
            placeholder="Search components…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-[#71717A] hover:text-[#FAFAFA]">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-1.5 px-3 pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-2.5 py-1 text-xs rounded-full border transition-all duration-150 ${
              activeCategory === cat
                ? 'bg-[#5227FF] border-[#5227FF] text-white'
                : 'bg-transparent border-[#3F3F46] text-[#A1A1AA] hover:border-[#5227FF]/60'
            }`}
          >
            {cat === 'all' ? 'All' : cat}
          </button>
        ))}
      </div>

      {/* Component list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 scrollbar-thin scrollbar-thumb-[#3F3F46]">
        <p className="text-xs text-[#52525B] pb-1">
          {filtered.length} component{filtered.length !== 1 ? 's' : ''} · click to add
        </p>
        {filtered.length === 0 ? (
          <p className="text-xs text-[#52525B] text-center pt-8">No results for "{query}"</p>
        ) : (
          filtered.map((c) => <ComponentCard key={c.key} entry={c} />)
        )}
      </div>
    </motion.div>
  )
}
