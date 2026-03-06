'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Grid2X2, List, ChevronDown, X, Eye, ExternalLink, Plus, BookMarked } from 'lucide-react'
import { useSwipeStore } from '../store/swipeStore'
import { useInspirations } from '../hooks/useInspirations'
import { useUIStore } from '../store/uiStore'

const SOURCE_BADGE_COLORS = {
  'dribbble.com': '#EA4C89',
  'behance.net': '#1769FF',
  'linear.app': '#5E6AD2',
  'vercel.com': '#FFFFFF',
  default: '#A1A1AA',
}

const HEIGHT_CLASSES = ['aspect-[4/5]', 'aspect-[3/4]', 'aspect-[1/1]', 'aspect-[4/3]', 'aspect-[3/5]']

function getAspect(id) {
  return HEIGHT_CLASSES[parseInt(id || '1', 36) % HEIGHT_CLASSES.length]
}

function InspirationCard({ item, index }) {
  const aspect = getAspect(item.id)
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (index % 12) * 0.04, type: 'spring', stiffness: 180 }}
      className="break-inside-avoid mb-4"
    >
      <Link href={`/swipe-file/${item.id}`} className="group block">
        <div className="bg-[#18181B] border border-[#3F3F46] rounded-xl overflow-hidden hover:border-[#A78BFA]/60 hover:shadow-glow-accent transition-all duration-300">
          <div className={`relative overflow-hidden ${aspect} bg-[#27272A]`}>
            <img
              src={item.imageUrl}
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Source badge */}
            <div className="absolute top-2 left-2">
              <span
                className="px-2 py-0.5 rounded-md text-[10px] font-medium text-white/90 backdrop-blur-sm"
                style={{
                  background: `${SOURCE_BADGE_COLORS[item.sourceDomain] || SOURCE_BADGE_COLORS.default}33`,
                  border: `1px solid ${SOURCE_BADGE_COLORS[item.sourceDomain] || SOURCE_BADGE_COLORS.default}44`,
                }}
              >
                {item.sourceDomain}
              </span>
            </div>

            {/* Hover View button */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="flex items-center gap-2 bg-black/70 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-white text-sm font-medium">
                <Eye size={15} /> View
              </span>
            </div>

            {/* Title overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
              <p className="text-white text-sm font-medium line-clamp-1">{item.title}</p>
            </div>
          </div>

          {/* Card footer */}
          <div className="p-3">
            <p className="text-[#FAFAFA] text-sm font-medium truncate">{item.title}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {item.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="px-2 py-0.5 bg-[#27272A] border border-[#3F3F46] rounded-md text-[#A1A1AA] text-[11px]">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

function InspirationListItem({ item, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Link href={`/swipe-file/${item.id}`} className="group flex items-center gap-4 p-4 bg-[#18181B] border border-[#3F3F46] rounded-xl hover:border-[#A78BFA]/50 hover:shadow-glow-accent transition-all">
        <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#27272A] flex-shrink-0">
          <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[#FAFAFA] font-medium truncate group-hover:text-accent transition-colors">{item.title}</p>
          <p className="text-[#A1A1AA] text-sm mt-0.5">{item.sourceDomain}</p>
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            {item.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="px-2 py-0.5 bg-[#27272A] border border-[#3F3F46] rounded-md text-[#A1A1AA] text-xs">{tag}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex gap-1">
            {(item.analysis?.dominantColors ?? []).slice(0, 3).map((c) => (
              <div key={c.hex} className="w-5 h-5 rounded-md border border-white/10" style={{ background: c.hex }} />
            ))}
          </div>
          <span className="text-[#52525B] text-sm">{new Date(item.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          <ExternalLink size={14} className="text-[#52525B] group-hover:text-accent transition-colors" />
        </div>
      </Link>
    </motion.div>
  )
}

export default function SwipeFile() {
  const { selectedTags, toggleTag, clearTags, viewMode, setViewMode, sortBy, setSortBy, searchQuery, setSearch } = useSwipeStore()
  const { inspirations, filtered, isLoading } = useInspirations()
  const { openSaveModal } = useUIStore()

  const popularTags = useMemo(() => {
    const count = {}
    inspirations.forEach((item) => item.tags.forEach((t) => { count[t] = (count[t] || 0) + 1 }))
    return Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([tag]) => tag)
  }, [inspirations])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#FAFAFA]">Swipe File</h1>
          <p className="text-[#A1A1AA] mt-1">
            Your curated visual inspiration <span className="ml-2 px-2 py-0.5 bg-[#27272A] border border-[#3F3F46] rounded-full text-xs">{filtered.length} items</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-[#27272A] border border-[#3F3F46] rounded-xl p-1 gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#3F3F46] text-[#FAFAFA]' : 'text-[#A1A1AA] hover:text-[#FAFAFA]'}`}
            >
              <Grid2X2 size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[#3F3F46] text-[#FAFAFA]' : 'text-[#A1A1AA] hover:text-[#FAFAFA]'}`}
            >
              <List size={16} />
            </button>
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-[#27272A] border border-[#3F3F46] rounded-xl pl-3 pr-8 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#A78BFA] cursor-pointer"
            >
              <option value="date">Date Added</option>
              <option value="relevance">Relevance</option>
              <option value="color">Color</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A1A1AA] pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mb-6 space-y-3">
        {/* Tags */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[#A1A1AA] text-sm font-medium">Filter:</span>
          {popularTags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                selectedTags.includes(tag)
                  ? 'bg-accent/20 border border-accent/50 text-accent'
                  : 'bg-[#27272A] border border-[#3F3F46] text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-[#52525B]'
              }`}
            >
              {tag}
            </button>
          ))}
          {selectedTags.length > 0 && (
            <button onClick={clearTags} className="flex items-center gap-1 text-[#A1A1AA] hover:text-[#FAFAFA] text-sm transition-colors">
              <X size={12} /> Clear
            </button>
          )}
        </div>

        {/* Active filter chips */}
        {selectedTags.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <span className="text-[#A1A1AA] text-xs">Active:</span>
            {selectedTags.map((tag) => (
              <span key={tag} onClick={() => toggleTag(tag)} className="flex items-center gap-1.5 px-2.5 py-1 bg-accent/20 border border-accent/40 rounded-lg text-accent text-xs cursor-pointer hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400 transition-all">
                {tag} <X size={10} />
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      {!isLoading && inspirations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 gap-5 text-center">
          <div className="w-20 h-20 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
            <BookMarked size={32} className="text-accent" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#FAFAFA]">Your swipe file is empty</h2>
            <p className="text-[#A1A1AA] text-sm mt-1.5 max-w-xs mx-auto">Save your first design inspiration to start building your brand DNA.</p>
          </div>
          <button
            onClick={openSaveModal}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors"
          >
            <Plus size={16} /> Save Your First Inspiration
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-[#A1A1AA] text-lg">No items match your filters</p>
          <button onClick={clearTags} className="mt-3 text-accent hover:text-accent-hover text-sm transition-colors">Clear all filters</button>
        </div>
      ) : viewMode === 'grid' ? (
        <AnimatePresence mode="popLayout">
          <div
            key="grid"
            className="columns-2 md:columns-3 lg:columns-4 gap-4"
          >
            {filtered.map((item, i) => (
              <InspirationCard key={item.id} item={item} index={i} />
            ))}
          </div>
        </AnimatePresence>
      ) : (
        <AnimatePresence mode="popLayout">
          <div key="list" className="space-y-3">
            {filtered.map((item, i) => (
              <InspirationListItem key={item.id} item={item} index={i} />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  )
}
