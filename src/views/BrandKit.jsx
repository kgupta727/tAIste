'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Package, FileText, Heart, Code2, Figma, Braces, Download,
  Eye, EyeOff, Check, ChevronRight, Volume2, AlertCircle
} from 'lucide-react'
import { BRAND_KIT, EXPORT_FORMATS, generateExportContent } from '../data/brandKit'
import { useInspirations } from '../hooks/useInspirations'
import { useBrandDNA } from '../hooks/useBrandDNA'
import { useUIStore } from '../store/uiStore'

const ICON_MAP = { FileText, Heart, Code2, Figma, Braces }

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 24 } },
}

function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function buildLiveKit(brandDNA, inspirations) {
  const primaryColors = (brandDNA?.colorPalette?.primary ?? []).map((c) => ({
    role: c.role ?? 'Color',
    hex: c.hex,
    name: c.name,
    usage: (c.role ?? 'Primary') + ' — ' + (c.percentage ?? '?') + '% frequency',
  }))
  const accentColors = (brandDNA?.colorPalette?.accent ?? []).map((c) => ({
    role: 'Accent',
    hex: c.hex,
    name: c.name,
    usage: 'Accent — ' + (c.percentage ?? '?') + '% frequency',
  }))
  const recs = brandDNA?.typography?.recommendations ?? []
  const heading = recs[0] ?? { name: 'Inter' }
  const body = recs[1] ?? { name: 'Inter' }
  const mono = recs.find((r) => r.category?.toLowerCase().includes('mono')) ?? recs[2] ?? { name: 'JetBrains Mono' }
  const voiceDescriptors = (brandDNA?.visualTone?.descriptors ?? [])
    .filter((d) => d.weight >= 0.6)
    .map((d) => d.label)
    .slice(0, 5)
  const colors = [...primaryColors, ...accentColors]
  return {
    name: (brandDNA?.aestheticSignature?.archetype ?? 'My') + ' Brand Kit',
    createdAt: new Date().toISOString().split('T')[0],
    version: '1.0',
    colors: colors.length > 0 ? colors : BRAND_KIT.colors,
    typography: {
      heading: { family: heading.name, weight: 'Bold (700)', sample: 'The quick brown fox jumps' },
      body: { family: body.name, weight: 'Regular (400)', sample: 'Clean, precise, and human. Typography that earns attention.' },
      mono: { family: mono.name, weight: 'Medium (500)', sample: 'const brand = { voice: "confident" };' },
      scale: 'Major Third (1.250)',
    },
    toneOfVoice: {
      descriptors: voiceDescriptors.length > 0 ? voiceDescriptors : BRAND_KIT.toneOfVoice.descriptors,
      avoid: BRAND_KIT.toneOfVoice.avoid,
      examples: BRAND_KIT.toneOfVoice.examples,
    },
    referenceAssets: inspirations.slice(0, 6).map((i) => i.id),
  }
}

export default function BrandKit() {
  const { activeExportFormat, setActiveExportFormat } = useUIStore()
  const { inspirations } = useInspirations()
  const { brandDNA } = useBrandDNA()
  const [previewOpen, setPreviewOpen] = useState(false)
  const [downloadedFormats, setDownloadedFormats] = useState([])
  const liveKit = useMemo(() => buildLiveKit(brandDNA, inspirations), [brandDNA, inspirations])

  const activeFormat = EXPORT_FORMATS.find((f) => f.id === activeExportFormat) || EXPORT_FORMATS[0]

  const previewContent = generateExportContent(activeFormat.id, liveKit, brandDNA)

  const handleDownload = (format) => {
    const content = generateExportContent(format.id, liveKit, brandDNA)
    const name = `tastestack-brand-kit${format.extension}`
    downloadFile(name, content)
    setDownloadedFormats((prev) => [...prev, format.id])
    setTimeout(() => setDownloadedFormats((prev) => prev.filter((id) => id !== format.id)), 3000)
  }

  const refAssetItems = inspirations.slice(0, 6)

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex h-full min-h-screen"
    >
      {/* Main content */}
      <div className="flex-1 px-8 py-8 max-w-4xl space-y-8">
        {/* Header */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-3 mb-1">
            <Package size={24} className="text-accent" />
            <h1 className="text-3xl font-bold text-[#FAFAFA]">Brand Kit</h1>
          </div>
          <p className="text-[#A1A1AA]">Export your visual identity to any AI builder</p>
        </motion.div>

        {/* Colors Table */}
        <motion.div variants={itemVariants} className="bg-[#18181B] border border-[#3F3F46] rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-[#3F3F46]">
            <div className="w-3 h-3 rounded-full bg-accent" />
            <h2 className="font-semibold text-[#FAFAFA]">Colors</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider border-b border-[#27272A]">
                  <th className="px-6 py-3 text-left">Role</th>
                  <th className="px-6 py-3 text-left">Color</th>
                  <th className="px-6 py-3 text-left">Hex</th>
                  <th className="px-6 py-3 text-left">Name</th>
                  <th className="px-6 py-3 text-left">Usage</th>
                </tr>
              </thead>
              <tbody>
                {liveKit.colors.map((color, i) => (
                  <motion.tr
                    key={color.hex}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-[#27272A] hover:bg-[#27272A]/50 transition-colors"
                  >
                    <td className="px-6 py-3 text-[#A1A1AA] text-sm">{color.role}</td>
                    <td className="px-6 py-3">
                      <div className="w-8 h-8 rounded-lg border border-white/10 shadow-inner" style={{ background: color.hex }} />
                    </td>
                    <td className="px-6 py-3 text-[#FAFAFA] text-sm font-mono">{color.hex}</td>
                    <td className="px-6 py-3 text-[#FAFAFA] text-sm">{color.name}</td>
                    <td className="px-6 py-3 text-[#A1A1AA] text-sm">{color.usage}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Typography */}
        <motion.div variants={itemVariants} className="bg-[#18181B] border border-[#3F3F46] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-3 h-3 rounded-full bg-[#60A5FA]" />
            <h2 className="font-semibold text-[#FAFAFA]">Typography</h2>
          </div>
          <div className="space-y-5">
            {/* Heading */}
            <div className="bg-[#27272A] rounded-xl p-4 border border-[#3F3F46]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider">Heading</span>
                <span className="text-[#52525B] text-xs font-mono">{liveKit.typography.heading.family} · {liveKit.typography.heading.weight}</span>
              </div>
              <p className="text-[#FAFAFA] text-3xl font-bold" style={{ fontFamily: 'Inter' }}>
                {liveKit.typography.heading.sample}
              </p>
            </div>
            {/* Body */}
            <div className="bg-[#27272A] rounded-xl p-4 border border-[#3F3F46]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider">Body</span>
                <span className="text-[#52525B] text-xs font-mono">{liveKit.typography.body.family} · {liveKit.typography.body.weight}</span>
              </div>
              <p className="text-[#FAFAFA] text-base leading-relaxed" style={{ fontFamily: 'Inter' }}>
                {liveKit.typography.body.sample}
              </p>
            </div>
            {/* Mono */}
            <div className="bg-[#27272A] rounded-xl p-4 border border-[#3F3F46]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider">Monospace</span>
                <span className="text-[#52525B] text-xs font-mono">{liveKit.typography.mono.family}</span>
              </div>
              <p className="text-accent text-sm font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {liveKit.typography.mono.sample}
              </p>
            </div>
            <p className="text-[#A1A1AA] text-sm">
              Type scale: <span className="text-[#FAFAFA] font-medium">{liveKit.typography.scale}</span>
            </p>
          </div>
        </motion.div>

        {/* Tone of Voice */}
        <motion.div variants={itemVariants} className="bg-[#18181B] border border-[#3F3F46] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Volume2 size={16} className="text-[#34D399]" />
            <h2 className="font-semibold text-[#FAFAFA]">Tone of Voice</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider mb-3">Voice</p>
              <div className="flex flex-wrap gap-2">
                {liveKit.toneOfVoice.descriptors.map((d) => (
                  <span key={d} className="px-3 py-1.5 bg-[#27272A] border border-[#34D399]/30 text-[#34D399] rounded-lg text-sm">{d}</span>
                ))}
              </div>
              <p className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider mt-4 mb-3">Avoid</p>
              <div className="flex flex-wrap gap-2">
                {liveKit.toneOfVoice.avoid.map((d) => (
                  <span key={d} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#27272A] border border-red-500/30 text-red-400 rounded-lg text-sm">
                    <AlertCircle size={12} /> {d}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider mb-3">Examples</p>
              <div className="space-y-2">
                {liveKit.toneOfVoice.examples.map((ex, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-sm border ${
                      ex.type === 'good'
                        ? 'bg-[#34D399]/10 border-[#34D399]/20 text-[#FAFAFA]'
                        : 'bg-red-500/10 border-red-500/20 text-[#A1A1AA] line-through'
                    }`}
                  >
                    <span className="flex-shrink-0 mt-0.5">{ex.type === 'good' ? '✅' : '❌'}</span>
                    {ex.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Reference Assets */}
        {refAssetItems.length > 0 && (
          <motion.div variants={itemVariants} className="bg-[#18181B] border border-[#3F3F46] rounded-2xl p-6">
            <h2 className="font-semibold text-[#FAFAFA] mb-4">Reference Assets</h2>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {refAssetItems.map((item) => (
                <div key={item.id} className="rounded-xl overflow-hidden aspect-[4/3] bg-[#27272A] border border-[#3F3F46]">
                  <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Export Panel (Right Sidebar) */}
      <motion.div
        variants={itemVariants}
        className="w-72 flex-shrink-0 border-l border-[#3F3F46] bg-[#18181B] sticky top-0 h-screen overflow-y-auto"
      >
        <div className="p-5">
          <h2 className="font-semibold text-[#FAFAFA] mb-1">Export</h2>
          <p className="text-[#A1A1AA] text-xs mb-5">Download your brand kit for your tools</p>

          <div className="space-y-2">
            {EXPORT_FORMATS.map((format) => {
              const Icon = ICON_MAP[format.icon] || FileText
              const isActive = activeExportFormat === format.id
              const isDownloaded = downloadedFormats.includes(format.id)

              return (
                <div
                  key={format.id}
                  className={`rounded-xl border transition-all ${
                    isActive
                      ? 'bg-accent/10 border-accent/40'
                      : 'bg-[#27272A] border-[#3F3F46] hover:border-[#52525B] cursor-pointer'
                  }`}
                >
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    onClick={() => setActiveExportFormat(format.id)}
                  >
                    <div
                      className="p-2 rounded-lg flex-shrink-0"
                      style={{ background: `${format.color}20`, border: `1px solid ${format.color}40` }}
                    >
                      <Icon size={16} style={{ color: format.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[#FAFAFA] text-sm font-medium">{format.name}</span>
                        <span className="text-[#A1A1AA] text-[10px] font-mono bg-[#3F3F46] px-1.5 py-0.5 rounded">{format.extension}</span>
                      </div>
                      <p className="text-[#A1A1AA] text-xs mt-0.5 truncate">{format.description}</p>
                    </div>
                  </button>

                  {isActive && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="border-t border-[#3F3F46] px-4 pb-3"
                    >
                      {/* Preview toggle */}
                      <button
                        onClick={() => setPreviewOpen(!previewOpen)}
                        className="flex items-center gap-2 text-[#A1A1AA] hover:text-[#FAFAFA] text-xs mt-3 mb-2 transition-colors"
                      >
                        {previewOpen ? <EyeOff size={12} /> : <Eye size={12} />}
                        {previewOpen ? 'Hide Preview' : 'Show Preview'}
                      </button>

                      {previewOpen && (
                        <motion.pre
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="bg-[#09090B] border border-[#3F3F46] rounded-lg p-3 text-[10px] font-mono text-[#A1A1AA] overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap mb-3"
                        >
                          {previewContent.slice(0, 800)}{previewContent.length > 800 ? '\n...(truncated)' : ''}
                        </motion.pre>
                      )}

                      <motion.button
                        onClick={() => handleDownload(format)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white font-semibold rounded-xl py-2.5 text-sm transition-colors"
                      >
                        {isDownloaded ? (
                          <><Check size={15} /> Downloaded!</>
                        ) : (
                          <><Download size={15} /> Download {format.extension}</>
                        )}
                      </motion.button>
                    </motion.div>
                  )}
                </div>
              )
            })}
          </div>

          <p className="text-[#52525B] text-xs mt-5 text-center leading-relaxed">
            Files are generated client-side and ready to paste into your AI tools.
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}
