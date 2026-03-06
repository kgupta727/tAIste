'use client'

import { useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, ExternalLink, Plus, X, ChevronRight, Trash2 } from 'lucide-react'
import { useInspirations } from '../hooks/useInspirations'

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 24 } },
}

export default function InspirationDetail() {
  const { id } = useParams()
  const router = useRouter()
  const { inspirations, updateInspiration, removeInspiration } = useInspirations()

  const handleDelete = async () => {
    if (!window.confirm('Remove this inspiration?')) return
    await removeInspiration(item.id)
    router.push('/swipe-file')
  }

  const item = inspirations.find((i) => i.id === id)

  const [notes, setNotes] = useState(item?.notes || '')
  const [tagInput, setTagInput] = useState('')
  const [localTags, setLocalTags] = useState(item?.tags || [])

  const related = useMemo(() => {
    if (!item) return []
    return inspirations
      .filter((i) => i.id !== id && i.tags.some((t) => item.tags.includes(t)))
      .slice(0, 6)
  }, [inspirations, id, item])

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-[#A1A1AA]">Inspiration not found.</p>
        <Link href="/swipe-file" className="text-accent hover:text-accent-hover text-sm">← Back to Swipe File</Link>
      </div>
    )
  }

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-')
    if (t && !localTags.includes(t)) setLocalTags([...localTags, t])
    setTagInput('')
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="max-w-7xl mx-auto px-8 py-8">
      {/* Back button + delete */}
      <motion.div variants={itemVariants} className="mb-6 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[#A1A1AA] hover:text-[#FAFAFA] text-sm transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to Swipe File
        </button>
        <button
          onClick={handleDelete}
          className="flex items-center gap-1.5 text-[#52525B] hover:text-red-400 text-sm transition-colors"
        >
          <Trash2 size={15} /> Delete
        </button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Image (3 cols) */}
        <motion.div variants={itemVariants} className="lg:col-span-3">
          <div className="rounded-2xl overflow-hidden bg-[#18181B] border border-[#3F3F46]">
            <img
              src={item.imageUrl}
              alt={item.title}
              className="w-full h-auto object-cover"
            />
          </div>
        </motion.div>

        {/* Metadata (2 cols) */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
          {/* Title + Source */}
          <div>
            <h1 className="text-2xl font-bold text-[#FAFAFA]">{item.title}</h1>
            <a
              href={item.sourceUrl || `https://${item.sourceDomain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-accent hover:text-accent-hover text-sm mt-1 transition-colors w-fit"
            >
              {item.sourceDomain} <ExternalLink size={12} />
            </a>
            <p className="text-[#52525B] text-sm mt-1">
              Saved {new Date(item.savedAt).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider mb-2 block">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What caught your eye about this..."
              rows={3}
              className="w-full bg-[#18181B] border border-[#3F3F46] rounded-xl px-3 py-2.5 text-sm text-[#FAFAFA] placeholder-[#A1A1AA] focus:outline-none focus:border-[#A78BFA] transition-all resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider mb-2 block">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {localTags.map((tag) => (
                <span
                  key={tag}
                  onClick={() => setLocalTags(localTags.filter((t) => t !== tag))}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-[#27272A] border border-[#3F3F46] rounded-lg text-[#A1A1AA] text-xs cursor-pointer hover:border-red-500/40 hover:text-red-400 transition-all"
                >
                  {tag} <X size={10} />
                </span>
              ))}
              <div className="flex items-center gap-1 px-2.5 py-1 bg-[#18181B] border border-dashed border-[#3F3F46] rounded-lg">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTag()}
                  placeholder="+ tag"
                  className="bg-transparent text-xs text-[#A1A1AA] placeholder-[#52525B] focus:outline-none w-16"
                />
                <button onClick={addTag} className="text-[#52525B] hover:text-accent">
                  <Plus size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* Save changes */}
          <button
            onClick={() => updateInspiration(item.id, { notes, tags: localTags })}
            className="w-full py-2.5 bg-accent/20 border border-accent/40 hover:bg-accent/30 rounded-xl text-accent text-sm font-medium transition-all"
          >
            Save Changes
          </button>

          {/* Extracted Colors */}
          <div>
            <label className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider mb-3 block">Extracted Colors</label>
            <div className="space-y-2">
              {(item.analysis?.dominantColors ?? []).map((color) => (
                <div key={color.hex} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg border border-white/10 flex-shrink-0" style={{ background: color.hex }} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[#FAFAFA] text-sm">{color.name}</span>
                      <span className="text-[#A1A1AA] text-xs font-mono">{color.hex}</span>
                    </div>
                    <div className="w-full bg-[#27272A] rounded-full h-1">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${color.percentage}%` }}
                        transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
                        className="h-1 rounded-full"
                        style={{ background: color.hex }}
                      />
                    </div>
                  </div>
                  <span className="text-[#52525B] text-xs w-8 text-right">{color.percentage}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mood */}
          <div>
            <label className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider mb-2 block">Mood</label>
            <div className="flex flex-wrap gap-2">
              {(item.analysis?.mood ?? []).map((m) => (
                <span key={m} className="px-3 py-1.5 bg-[#27272A] border border-[#3F3F46] rounded-lg text-[#FAFAFA] text-sm capitalize">{m}</span>
              ))}
            </div>
          </div>

          {/* Typography */}
          <div>
            <label className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider mb-2 block">Typography Style</label>
            <p className="text-[#FAFAFA] text-sm capitalize">{item.analysis?.typographyStyle ?? '—'}</p>
          </div>

          {/* Layout Pattern */}
          <div>
            <label className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider mb-2 block">Layout Pattern</label>
            <p className="text-[#FAFAFA] text-sm capitalize">{item.analysis?.layoutPattern ?? '—'}</p>
          </div>
        </motion.div>
      </div>

      {/* Related Items */}
      {related.length > 0 && (
        <motion.div variants={itemVariants} className="mt-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[#FAFAFA]">Related Inspiration</h2>
            <Link href="/swipe-file" className="text-sm text-accent hover:text-accent-hover flex items-center gap-1">
              View all <ChevronRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {related.map((rel, i) => (
              <Link key={rel.id} href={`/swipe-file/${rel.id}`} className="group block">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-[#18181B] border border-[#3F3F46] rounded-xl overflow-hidden hover:border-[#A78BFA]/50 transition-all"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-[#27272A]">
                    <img src={rel.imageUrl} alt={rel.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  </div>
                  <div className="p-2">
                    <p className="text-[#FAFAFA] text-xs font-medium truncate group-hover:text-accent transition-colors">{rel.title}</p>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
