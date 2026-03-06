'use client'

import { useRef, useMemo } from 'react'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import {
  BookMarked, Tags, BrainCircuit, Palette, ArrowRight,
  Plus, Dna, Package, TrendingUp, Zap
} from 'lucide-react'
import AnimatedCounter from '../components/common/AnimatedCounter'
import { useInspirations } from '../hooks/useInspirations'
import { useBrandDNA } from '../hooks/useBrandDNA'
import { useUIStore } from '../store/uiStore'

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 22 } },
}

export default function Dashboard() {
  const { inspirations } = useInspirations()
  const { brandDNA } = useBrandDNA()
  const { openSaveModal } = useUIStore()
  const recentSaves = useMemo(
    () => [...inspirations].sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt)).slice(0, 8),
    [inspirations]
  )

  const uniqueTagCount = useMemo(() => {
    const set = new Set()
    inspirations.forEach((item) => item.tags?.forEach((t) => set.add(t)))
    return set.size
  }, [inspirations])

  const statCards = [
    { icon: BookMarked, label: 'Saves', value: inspirations.length, color: '#A78BFA', bg: 'rgba(167,139,250,0.1)' },
    { icon: Tags, label: 'Tags', value: uniqueTagCount, color: '#34D399', bg: 'rgba(52,211,153,0.1)' },
    { icon: BrainCircuit, label: 'DNA Confidence', value: brandDNA?.meta?.confidenceScore ?? 87, suffix: '%', color: '#60A5FA', bg: 'rgba(96,165,250,0.1)' },
    { icon: Palette, label: 'Color Palette', value: brandDNA?.colorPalette?.primary?.length ?? 5, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  ]

  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="px-8 py-8 max-w-7xl mx-auto space-y-10"
    >
      {/* Greeting */}
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-[#FAFAFA]">Good evening 👋</h1>
        <p className="text-[#A1A1AA] mt-1 text-base">Your brand DNA is taking shape. {brandDNA?.meta?.confidenceScore ?? 87}% confidence and counting.</p>
      </motion.div>

      {/* Stats Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ icon: Icon, label, value, suffix = '', color, bg }) => (
          <motion.div
            key={label}
            whileHover={{ scale: 1.03, boxShadow: `0 8px 30px rgba(0,0,0,0.3)` }}
            className="bg-[#18181B] border border-[#3F3F46] rounded-xl p-5 flex flex-col gap-3 transition-all cursor-default"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg" style={{ background: bg }}>
                <Icon size={18} style={{ color }} />
              </div>
              <TrendingUp size={14} className="text-[#52525B]" />
            </div>
            <div>
              <div className="text-3xl font-bold text-[#FAFAFA]">
                <AnimatedCounter target={value} suffix={suffix} />
              </div>
              <div className="text-[#A1A1AA] text-sm mt-0.5">{label}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Recent Saves */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[#FAFAFA]">Recent Saves</h2>
          <Link
            href="/swipe-file"
            className="text-sm text-accent hover:text-accent-hover flex items-center gap-1 transition-colors"
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
          {recentSaves.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                href={`/swipe-file/${item.id}`}
                className="group flex-shrink-0 w-44 block"
              >
                <div className="relative overflow-hidden rounded-xl aspect-[4/3] bg-[#27272A] border border-[#3F3F46] group-hover:border-[#A78BFA] transition-all group-hover:shadow-glow-accent">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="mt-2 px-0.5">
                  <p className="text-[#FAFAFA] text-sm font-medium truncate group-hover:text-accent transition-colors">{item.title}</p>
                  <p className="text-[#A1A1AA] text-xs mt-0.5">{new Date(item.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Brand DNA Summary */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-2 bg-[#18181B] border border-[#3F3F46] rounded-xl p-6 relative overflow-hidden group"
        >
          {/* Gradient accent */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#A78BFA]/10 to-transparent rounded-bl-full" />

          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider mb-1">Aesthetic Archetype</p>
              <h3 className="text-2xl font-bold text-[#FAFAFA]">{brandDNA?.aestheticSignature?.archetype}</h3>
              <p className="text-[#A78BFA] text-sm mt-0.5 font-medium italic">{brandDNA?.aestheticSignature?.tagline}</p>
            </div>
            <div className="px-3 py-1 bg-[#A78BFA]/20 border border-[#A78BFA]/40 rounded-full text-accent text-xs font-medium">
              {brandDNA?.meta?.confidenceScore ?? 87}% confidence
            </div>
          </div>

          {/* Color swatches */}
          <div className="flex gap-2 mb-5">
            {(brandDNA?.colorPalette?.primary ?? []).map((c) => (
              <div key={c.hex} className="group/swatch relative">
                <div
                  className="w-8 h-8 rounded-lg border border-white/10"
                  style={{ background: c.hex }}
                  title={`${c.name} ${c.hex}`}
                />
              </div>
            ))}
          </div>

          <p className="text-[#A1A1AA] text-sm leading-relaxed line-clamp-2">
            {brandDNA?.aestheticSignature?.description}
          </p>

          <Link
            href="/brand-dna"
            className="mt-4 inline-flex items-center gap-1.5 text-accent hover:text-accent-hover text-sm font-medium transition-colors"
          >
            View Full Analysis <ArrowRight size={14} />
          </Link>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants} className="space-y-3">
          <h2 className="text-lg font-semibold text-[#FAFAFA] mb-1">Quick Actions</h2>

          {[
            {
              icon: Plus,
              label: 'Save Inspiration',
              desc: 'Add a URL or upload an image',
              action: openSaveModal,
              color: '#A78BFA',
            },
            {
              icon: Dna,
              label: 'View Brand DNA',
              desc: 'Explore your aesthetic patterns',
              to: '/brand-dna',
              color: '#60A5FA',
            },
            {
              icon: Package,
              label: 'Export Brand Kit',
              desc: 'Ship to Claude Code, Cursor & more',
              to: '/brand-kit',
              color: '#34D399',
            },
          ].map(({ icon: Icon, label, desc, action, to, color }) => {
            const inner = (
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-3 bg-[#18181B] border border-[#3F3F46] rounded-xl px-4 py-3 cursor-pointer hover:border-[#A78BFA]/50 group transition-all"
              >
                <div
                  className="p-2 rounded-lg flex-shrink-0"
                  style={{ background: `${color}15`, border: `1px solid ${color}30` }}
                >
                  <Icon size={16} style={{ color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[#FAFAFA] font-medium text-sm">{label}</p>
                  <p className="text-[#A1A1AA] text-xs truncate">{desc}</p>
                </div>
                <ArrowRight size={14} className="text-[#52525B] group-hover:text-accent ml-auto transition-colors flex-shrink-0" />
              </motion.div>
            )
            return action ? (
              <div key={label} onClick={action}>{inner}</div>
            ) : (
              <Link key={label} href={to}>{inner}</Link>
            )
          })}
        </motion.div>
      </div>

      {/* Activities hint */}
      <motion.div
        variants={itemVariants}
        className="flex items-center gap-2 text-[#52525B] text-sm pb-4"
      >
        <Zap size={14} />
        <span>Brand DNA was last analyzed 2 hours ago based on 38 saved items.</span>
        <Link href="/brand-dna" className="text-accent hover:text-accent-hover transition-colors underline underline-offset-2">Refresh →</Link>
      </motion.div>
    </motion.div>
  )
}
