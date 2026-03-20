'use client'

import { useRef, useState, useMemo } from 'react'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import {
  Dna, Sparkles, Palette, Type, Eye, Clock, Target, Loader2, AlertCircle,
  Plus, Trash2, Check, Pencil, Volume2, Package, FileText, Heart, Code2,
  Figma, Braces, Download, EyeOff, Zap, FolderOpen, ChevronDown,
} from 'lucide-react'
import AnimatedCounter from '../components/common/AnimatedCounter'
import { useBrandDNA } from '../hooks/useBrandDNA'
import { useFolders } from '../hooks/useFolders'
import { useInspirations } from '../hooks/useInspirations'
import { useUIStore } from '../store/uiStore'
import { EXPORT_FORMATS, generateExportContent } from '../data/brandKit'

const ICON_MAP = { FileText, Heart, Code2, Figma, Braces }

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 180, damping: 24 } },
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function ConfidenceCircle({ score }) {
  const circumference = 2 * Math.PI * 40
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  return (
    <div ref={ref} className="relative w-24 h-24">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" stroke="#27272A" strokeWidth="8" fill="none" />
        <motion.circle
          cx="50" cy="50" r="40"
          stroke="#A78BFA" strokeWidth="8" fill="none" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={inView ? { strokeDashoffset: circumference * (1 - score / 100) } : {}}
          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[#FAFAFA] text-xl font-bold">
          <AnimatedCounter target={score} suffix="%" duration={1500} />
        </span>
      </div>
    </div>
  )
}

function ColorBar({ color, delay = 0 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  return (
    <div ref={ref} className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl border border-white/10 flex-shrink-0" style={{ background: color.hex }} />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1.5">
          <div>
            <span className="text-[#FAFAFA] text-sm font-medium">{color.name}</span>
            <span className="text-[#A1A1AA] text-xs ml-2 font-mono">{color.hex}</span>
          </div>
          <span className="text-[#A1A1AA] text-sm">{color.percentage}%</span>
        </div>
        <div className="w-full bg-[#27272A] rounded-full h-2">
          <motion.div
            className="h-2 rounded-full"
            initial={{ width: 0 }}
            animate={inView ? { width: `${color.percentage}%` } : {}}
            transition={{ delay, duration: 1, ease: [0.16, 1, 0.3, 1] }}
            style={{ background: `linear-gradient(to right, ${color.hex}, ${color.hex}99)` }}
          />
        </div>
      </div>
    </div>
  )
}

function TypographyConfBar({ style, index }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  return (
    <div ref={ref} className="flex items-center gap-4">
      <div className="w-48 flex-shrink-0">
        <p className="text-[#FAFAFA] text-sm font-medium">{style.style}</p>
        <p className="text-[#A1A1AA] text-xs mt-0.5">{style.description}</p>
      </div>
      <div className="flex-1 bg-[#27272A] rounded-full h-2">
        <motion.div
          className="h-2 rounded-full bg-gradient-to-r from-accent to-[#5E6AD2]"
          initial={{ width: 0 }}
          animate={inView ? { width: `${style.confidence}%` } : {}}
          transition={{ delay: index * 0.15, duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <span className="text-[#A1A1AA] text-sm w-8 text-right">{style.confidence}%</span>
    </div>
  )
}

// Confidence pill for component affinities
function ConfidencePill({ value }) {
  const pct = Math.round(value * 100)
  const color = pct >= 80 ? '#34D399' : pct >= 60 ? '#A78BFA' : '#F59E0B'
  return (
    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full border" style={{ color, borderColor: `${color}40`, background: `${color}12` }}>
      {pct}%
    </span>
  )
}

// ── Folder multi-select dropdown ─────────────────────────────────────────────

function FolderSelector({ folders, selectedIds, onChange }) {
  const [open, setOpen] = useState(false)
  const allSelected = selectedIds.length === 0

  const toggle = (id) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  const label = allSelected
    ? 'All saves'
    : `${selectedIds.length} folder${selectedIds.length > 1 ? 's' : ''}`

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#27272A] border border-[#3F3F46] rounded-xl text-[#A1A1AA] text-xs hover:border-[#52525B] hover:text-[#FAFAFA] transition-all"
      >
        <FolderOpen size={12} />
        <span>Scope: <strong className="text-[#FAFAFA]">{label}</strong></span>
        <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-[#1C1C1F] border border-[#3F3F46] rounded-xl shadow-xl min-w-[180px] py-1.5 max-h-56 overflow-y-auto">
          <button
            type="button"
            onClick={() => { onChange([]); setOpen(false) }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors hover:bg-[#27272A] ${allSelected ? 'text-[#A78BFA]' : 'text-[#A1A1AA]'}`}
          >
            {allSelected && <Check size={11} className="text-accent flex-shrink-0" />}
            {!allSelected && <span className="w-[11px]" />}
            All saves
          </button>
          {folders.map((f) => {
            const sel = selectedIds.includes(f.id)
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => toggle(f.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors hover:bg-[#27272A] ${sel ? 'text-[#FAFAFA]' : 'text-[#A1A1AA]'}`}
              >
                {sel
                  ? <Check size={11} className="text-accent flex-shrink-0" />
                  : <span className="w-[11px] h-[11px] rounded-full border border-[#52525B] flex-shrink-0" style={{ borderColor: f.color + '80' }} />
                }
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: f.color }} />
                {f.name}
              </button>
            )
          })}
          {folders.length === 0 && (
            <p className="px-3 py-2 text-[#52525B] text-xs">No folders yet</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Export sidebar (extracted from BrandKit) ──────────────────────────────────

function buildLiveKit(brandDNA, inspirations) {
  const primaryColors = (brandDNA?.colorPalette?.primary ?? []).map((c) => ({
    role: c.role ?? 'Color', hex: c.hex, name: c.name,
    usage: (c.role ?? 'Primary') + ' — ' + (c.percentage ?? '?') + '% frequency',
  }))
  const accentColors = (brandDNA?.colorPalette?.accent ?? []).map((c) => ({
    role: 'Accent', hex: c.hex, name: c.name,
    usage: 'Accent — ' + (c.percentage ?? '?') + '% frequency',
  }))
  const recs = brandDNA?.typography?.recommendations ?? []
  const heading = recs[0] ?? { name: 'Inter' }
  const body    = recs[1] ?? { name: 'Inter' }
  const mono    = recs.find((r) => r.category?.toLowerCase().includes('mono')) ?? recs[2] ?? { name: 'JetBrains Mono' }
  const voiceDescriptors = (
    brandDNA?.toneOfVoice?.voice ??
    (brandDNA?.visualTone?.descriptors ?? []).filter((d) => d.weight >= 0.6).map((d) => d.label)
  ).slice(0, 5)
  const colors = [...primaryColors, ...accentColors]
  return {
    name: (brandDNA?.aestheticSignature?.archetype ?? 'My') + ' Brand Kit',
    createdAt: new Date().toISOString().split('T')[0],
    version: '1.0',
    colors: colors.length > 0 ? colors : [],
    typography: {
      heading: { family: heading.name, weight: 'Bold (700)', sample: 'The quick brown fox jumps' },
      body:    { family: body.name, weight: 'Regular (400)', sample: 'Clean, precise, and human. Typography that earns attention.' },
      mono:    { family: mono.name, weight: 'Medium (500)', sample: 'const brand = { voice: "confident" };' },
      scale: 'Major Third (1.250)',
    },
    toneOfVoice: {
      descriptors: voiceDescriptors.length > 0 ? voiceDescriptors : [],
      avoid:    brandDNA?.toneOfVoice?.avoid ?? [],
      examples: brandDNA?.toneOfVoice?.examples ?? [],
    },
    referenceAssets: inspirations.slice(0, 6).map((i) => i.id),
  }
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

function ExportSidebar({ brandDNA, inspirations }) {
  const { activeExportFormat, setActiveExportFormat } = useUIStore()
  const [previewOpen, setPreviewOpen] = useState(false)
  const [downloadedFormats, setDownloadedFormats] = useState([])
  const liveKit = useMemo(() => buildLiveKit(brandDNA, inspirations), [brandDNA, inspirations])

  const activeFormat = EXPORT_FORMATS.find((f) => f.id === activeExportFormat) || EXPORT_FORMATS[0]
  const previewContent = generateExportContent(activeFormat.id, liveKit, brandDNA)

  const handleDownload = (format) => {
    const content = generateExportContent(format.id, liveKit, brandDNA)
    downloadFile(`tastestack-brand-kit${format.extension}`, content)
    setDownloadedFormats((prev) => [...prev, format.id])
    setTimeout(() => setDownloadedFormats((prev) => prev.filter((id) => id !== format.id)), 3000)
  }

  return (
    <div className="w-72 flex-shrink-0 border-l border-[#3F3F46] bg-[#18181B] overflow-y-auto">
      <div className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <Package size={15} className="text-accent" />
          <h2 className="font-semibold text-[#FAFAFA]">Export Brand Kit</h2>
        </div>
        <p className="text-[#A1A1AA] text-xs mb-5">Download your identity for AI builders</p>

        <div className="space-y-2">
          {EXPORT_FORMATS.map((format) => {
            const Icon = ICON_MAP[format.icon] || FileText
            const isActive = activeExportFormat === format.id
            const isDownloaded = downloadedFormats.includes(format.id)
            return (
              <div
                key={format.id}
                className={`rounded-xl border transition-all ${
                  isActive ? 'bg-accent/10 border-accent/40' : 'bg-[#27272A] border-[#3F3F46] hover:border-[#52525B] cursor-pointer'
                }`}
              >
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  onClick={() => setActiveExportFormat(format.id)}
                >
                  <div className="p-2 rounded-lg flex-shrink-0" style={{ background: `${format.color}20`, border: `1px solid ${format.color}40` }}>
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
                      {isDownloaded ? <><Check size={15} /> Downloaded!</> : <><Download size={15} /> Download {format.extension}</>}
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
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BrandDNA() {
  const { brandDNAs, activeBrandDNA, isLoading, reanalyzeBrandDNA, setActive, deleteDNA, renameDNA } = useBrandDNA()
  const { folders } = useFolders()
  const { inspirations } = useInspirations()

  const [error, setError] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [newDNAName, setNewDNAName] = useState('')
  const [selectedFolderIds, setSelectedFolderIds] = useState([])
  const [showNameInput, setShowNameInput] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [viewingId, setViewingId] = useState(null)

  const viewingRecord = viewingId
    ? brandDNAs.find((d) => d.id === viewingId) ?? activeBrandDNA
    : activeBrandDNA

  const brandDNA = viewingRecord?.data ?? null

  const handleGenerate = async () => {
    setError(null)
    const name = newDNAName.trim() || `DNA #${brandDNAs.length + 1}`
    setGenerating(true)
    const result = await reanalyzeBrandDNA(name, selectedFolderIds.length > 0 ? selectedFolderIds : undefined)
    setGenerating(false)
    setShowNameInput(false)
    setNewDNAName('')
    setSelectedFolderIds([])
    if (result?.error) setError(result.error)
    else if (result?.id) setViewingId(result.id)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Empty state
  if (brandDNAs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-6 text-center px-8">
        <div className="w-20 h-20 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
          <Dna size={32} className="text-accent" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[#FAFAFA]">No Brand DNA yet</h2>
          <p className="text-[#A1A1AA] text-sm mt-2 max-w-sm mx-auto">Save some inspirations first, then generate your first Brand DNA profile.</p>
        </div>
        {error && (
          <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-400/10 border border-amber-400/20 rounded-xl px-4 py-3">
            <AlertCircle size={16} />{error}
          </div>
        )}
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-60"
        >
          {generating ? <><Loader2 size={16} className="animate-spin" /> Analyzing...</> : <><Sparkles size={16} /> Generate Brand DNA</>}
        </button>
      </div>
    )
  }

  if (!brandDNA) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const { meta, colorPalette, typography, visualTone, aestheticSignature, toneOfVoice } = brandDNA
  const componentAffinities = Array.isArray(brandDNA.componentAffinities) ? brandDNA.componentAffinities : []

  const lastAnalyzedDisplay = (() => {
    const raw = meta.lastAnalyzed
    if (!raw || raw === 'just now') {
      return viewingRecord?.updatedAt
        ? new Date(viewingRecord.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Just now'
    }
    try { return new Date(raw).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
    catch { return 'Just now' }
  })()

  const scopedFolderIds = meta.scopedFolderIds ?? null
  const scopeLabel = scopedFolderIds && scopedFolderIds.length > 0
    ? `${scopedFolderIds.length} folder${scopedFolderIds.length > 1 ? 's' : ''}`
    : 'All saves'

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left: DNA analysis ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="px-8 py-8 max-w-4xl mx-auto space-y-8"
        >
          {/* DNA Tabs row */}
          <motion.div variants={itemVariants} className="flex items-center gap-2 flex-wrap">
            {brandDNAs.map((record) => {
              const isViewing = (viewingId ?? activeBrandDNA?.id) === record.id
              const recScope = record.data?.meta?.scopedFolderIds
              const recScopeLabel = recScope && recScope.length > 0 ? `${recScope.length} folders` : 'All'
              return (
                <div key={record.id} className="relative group/tab flex items-center">
                  {editingId === record.id ? (
                    <form
                      onSubmit={async (e) => { e.preventDefault(); await renameDNA(record.id, editingName); setEditingId(null) }}
                      className="flex items-center gap-1"
                    >
                      <input
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Escape' && setEditingId(null)}
                        className="bg-[#27272A] border border-[#A78BFA]/50 rounded-lg px-2 py-1 text-sm text-[#FAFAFA] focus:outline-none w-32"
                      />
                      <button type="submit" className="text-accent hover:text-accent-hover p-1"><Check size={13} /></button>
                    </form>
                  ) : (
                    <button
                      onClick={() => setViewingId(record.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all border ${
                        isViewing
                          ? 'bg-[#27272A] border-[#A78BFA]/50 text-[#FAFAFA]'
                          : 'bg-transparent border-[#3F3F46] text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-[#52525B]'
                      }`}
                    >
                      <Dna size={13} style={{ color: isViewing ? '#A78BFA' : undefined }} />
                      {record.name}
                      {/* Scope badge */}
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#3F3F46] text-[#71717A]">{recScopeLabel}</span>
                      {record.isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] flex-shrink-0" title="Active" />}
                    </button>
                  )}
                  {editingId !== record.id && (
                    <div className="absolute -top-2 -right-1 opacity-0 group-hover/tab:opacity-100 flex gap-0.5 transition-all">
                      <button onClick={() => { setEditingId(record.id); setEditingName(record.name) }} className="p-0.5 bg-[#27272A] border border-[#3F3F46] rounded text-[#52525B] hover:text-accent" title="Rename"><Pencil size={9} /></button>
                      {!record.isActive && (
                        <button onClick={() => setActive(record.id)} className="p-0.5 bg-[#27272A] border border-[#3F3F46] rounded text-[#52525B] hover:text-[#34D399]" title="Set as active"><Check size={9} /></button>
                      )}
                      <button
                        onClick={async () => {
                          if (!window.confirm(`Delete "${record.name}"?`)) return
                          await deleteDNA(record.id)
                          if (viewingId === record.id) setViewingId(null)
                        }}
                        className="p-0.5 bg-[#27272A] border border-[#3F3F46] rounded text-[#52525B] hover:text-red-400"
                        title="Delete"
                      ><Trash2 size={9} /></button>
                    </div>
                  )}
                </div>
              )
            })}

            {/* New Analysis form */}
            {showNameInput ? (
              <form onSubmit={(e) => { e.preventDefault(); handleGenerate() }} className="flex items-center gap-2 flex-wrap">
                <input
                  autoFocus
                  value={newDNAName}
                  onChange={(e) => setNewDNAName(e.target.value)}
                  placeholder={`DNA #${brandDNAs.length + 1}`}
                  className="bg-[#27272A] border border-[#A78BFA]/50 rounded-xl px-3 py-1.5 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:outline-none w-32"
                />
                <FolderSelector
                  folders={folders}
                  selectedIds={selectedFolderIds}
                  onChange={setSelectedFolderIds}
                />
                <button
                  type="submit"
                  disabled={generating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all"
                  style={{ background: '#A78BFA', color: '#09090B' }}
                >
                  {generating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  {generating ? 'Analyzing...' : 'Generate'}
                </button>
                <button type="button" onClick={() => { setShowNameInput(false); setSelectedFolderIds([]) }} className="text-[#52525B] hover:text-[#A1A1AA] text-sm">Cancel</button>
              </form>
            ) : (
          <button
            onClick={() => setShowNameInput(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.45)', color: '#A78BFA' }}
          >
            <Plus size={13} /> New Analysis
          </button>
            )}
          </motion.div>

          {error && (
            <motion.div variants={itemVariants} className="flex items-center gap-2 text-amber-400 text-sm bg-amber-400/10 border border-amber-400/20 rounded-xl px-4 py-3">
              <AlertCircle size={16} />{error}
            </motion.div>
          )}

          {/* Header */}
          <motion.div variants={itemVariants} className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#FAFAFA] flex items-center gap-3">
                <Dna className="text-accent" size={28} />
                {viewingRecord?.name ?? 'Brand DNA'}
              </h1>
              <p className="text-[#A1A1AA] mt-1">
                AI-extracted patterns from your {meta.itemsAnalyzed} saved items
                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[#27272A] border border-[#3F3F46] text-[#71717A]">
                  Scope: {scopeLabel}
                </span>
              </p>
            </div>
          </motion.div>

          {/* Overview Bar */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Items Analyzed', value: <AnimatedCounter target={meta.itemsAnalyzed} />, icon: Target, color: '#A78BFA' },
              { label: 'Confidence', value: <ConfidenceCircle score={meta.confidenceScore} />, icon: null, color: '#60A5FA', tall: true },
              { label: 'Last Analyzed', value: lastAnalyzedDisplay, icon: Clock, color: '#34D399', text: true },
              { label: 'Dominant Style', value: meta.dominantStyle, icon: Eye, color: '#F59E0B', text: true },
            ].map(({ label, value, icon: Icon, color, text, tall }) => (
              <div key={label} className="bg-[#18181B] border border-[#3F3F46] rounded-xl p-5 flex flex-col items-center gap-3">
                {Icon && <Icon size={18} style={{ color }} />}
                {tall ? value : <div className={`font-bold text-[#FAFAFA] ${text ? 'text-lg text-center' : 'text-3xl'}`}>{value}</div>}
                <p className="text-[#A1A1AA] text-sm text-center">{label}</p>
              </div>
            ))}
          </motion.div>

          {/* Color Palette */}
          <motion.div variants={itemVariants} className="bg-[#18181B] border border-[#3F3F46] rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Palette size={20} className="text-accent" />
              <h2 className="text-xl font-semibold text-[#FAFAFA]">Color Palette</h2>
            </div>
            <div className="space-y-8">
              <div>
                <h3 className="text-[#A1A1AA] text-sm font-medium uppercase tracking-wider mb-4">Primary Colors</h3>
                <div className="space-y-4">
                  {colorPalette.primary.map((color, i) => <ColorBar key={color.hex} color={color} delay={i * 0.1} />)}
                </div>
              </div>
              <div>
                <h3 className="text-[#A1A1AA] text-sm font-medium uppercase tracking-wider mb-4">Accent Colors</h3>
                <div className="flex gap-4">
                  {colorPalette.accent.map((color) => (
                    <div key={color.hex} className="flex flex-col items-center gap-2">
                      <div className="w-14 h-14 rounded-xl border border-white/10" style={{ background: color.hex }} />
                      <div className="text-center">
                        <p className="text-[#FAFAFA] text-xs font-medium">{color.name}</p>
                        <p className="text-[#A1A1AA] text-[10px] font-mono">{color.hex}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-[#A1A1AA] text-sm font-medium uppercase tracking-wider mb-4">Neutral Colors</h3>
                <div className="flex gap-4">
                  {colorPalette.neutral.map((color) => (
                    <div key={color.hex} className="flex flex-col items-center gap-2">
                      <div className="w-14 h-14 rounded-xl border border-white/10" style={{ background: color.hex }} />
                      <div className="text-center">
                        <p className="text-[#FAFAFA] text-xs font-medium">{color.name}</p>
                        <p className="text-[#A1A1AA] text-[10px] font-mono">{color.hex}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-[#27272A] rounded-xl p-4 border border-[#3F3F46]">
                <p className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider mb-2">Harmony Note</p>
                <p className="text-[#FAFAFA] text-sm leading-relaxed">{colorPalette.harmonyDescription}</p>
              </div>
            </div>
          </motion.div>

          {/* Typography */}
          <motion.div variants={itemVariants} className="bg-[#18181B] border border-[#3F3F46] rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Type size={20} className="text-accent" />
              <h2 className="text-xl font-semibold text-[#FAFAFA]">Typography Instincts</h2>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-[#A1A1AA] text-sm font-medium uppercase tracking-wider mb-4">Detected Styles</h3>
                <div className="space-y-4">
                  {typography.detected.map((style, i) => <TypographyConfBar key={style.style} style={style} index={i} />)}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider mb-2">Preferred Weights</p>
                  <div className="flex flex-wrap gap-2">
                    {typography.weights.map((w) => <span key={w} className="px-3 py-1.5 bg-[#27272A] border border-[#3F3F46] rounded-lg text-[#FAFAFA] text-sm">{w}</span>)}
                  </div>
                </div>
                <div>
                  <p className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider mb-2">Size Contrast</p>
                  <span className="px-3 py-1.5 bg-[#27272A] border border-[#3F3F46] rounded-lg text-[#FAFAFA] text-sm">{typography.sizeContrast}</span>
                </div>
              </div>
              <div>
                <h3 className="text-[#A1A1AA] text-sm font-medium uppercase tracking-wider mb-4">Recommended Fonts</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {typography.recommendations.map((font, i) => (
                    <motion.div
                      key={font.name}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-[#27272A] border border-[#3F3F46] rounded-xl p-4 hover:border-[#A78BFA]/50 transition-all"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[#FAFAFA] font-semibold" style={{ fontFamily: font.name }}>{font.name}</span>
                        <span className="text-xs px-2 py-0.5 bg-[#3F3F46] rounded-full text-[#A1A1AA]">{font.category}</span>
                      </div>
                      <p className="text-[#A1A1AA] text-xs leading-relaxed">{font.reason}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Visual Tone */}
          <motion.div variants={itemVariants} className="bg-[#18181B] border border-[#3F3F46] rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Eye size={20} className="text-accent" />
              <h2 className="text-xl font-semibold text-[#FAFAFA]">Visual Tone</h2>
            </div>
            <div className="flex flex-wrap gap-3 mb-6">
              {visualTone.descriptors.map(({ label, weight }) => (
                <motion.span
                  key={label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.random() * 0.5 }}
                  className="px-4 py-2 bg-[#27272A] border border-[#3F3F46] rounded-full text-[#FAFAFA] hover:border-accent/50 hover:bg-accent/10 transition-all cursor-default"
                  style={{ fontSize: `${0.75 + weight * 0.5}rem`, opacity: 0.5 + weight * 0.5, fontWeight: weight > 0.7 ? 600 : 400 }}
                >
                  {label}
                </motion.span>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
              {[
                { label: 'Contrast Level', value: visualTone.contrastLevel, color: '#A78BFA' },
                { label: 'Whitespace', value: visualTone.whitespacePreference, color: '#60A5FA' },
                { label: 'Aesthetic Coherence', value: `${meta.aestheticCoherence ?? 0}%`, color: '#34D399' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-[#27272A] border border-[#3F3F46] rounded-xl p-4">
                  <p className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
                  <p className="font-semibold" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>
            <div className="bg-[#27272A] rounded-xl p-4 border border-[#3F3F46]">
              <p className="text-[#FAFAFA] text-sm leading-relaxed">{visualTone.summary}</p>
            </div>
          </motion.div>

          {/* Tone of Voice */}
          {toneOfVoice && (
            <motion.div variants={itemVariants} className="bg-[#18181B] border border-[#3F3F46] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <Volume2 size={20} className="text-accent" />
                <h2 className="text-xl font-semibold text-[#FAFAFA]">Tone of Voice</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-5">
                  <div>
                    <p className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider mb-3">Voice</p>
                    <div className="flex flex-wrap gap-2">
                      {(toneOfVoice.voice ?? []).map((v) => <span key={v} className="px-3 py-1.5 bg-[#27272A] border border-[#34D399]/30 text-[#34D399] rounded-lg text-sm">{v}</span>)}
                    </div>
                  </div>
                  <div>
                    <p className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider mb-3">Avoid</p>
                    <div className="flex flex-wrap gap-2">
                      {(toneOfVoice.avoid ?? []).map((v) => (
                        <span key={v} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#27272A] border border-red-500/30 text-red-400 rounded-lg text-sm">
                          <AlertCircle size={12} /> {v}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider mb-3">Examples</p>
                  <div className="space-y-2">
                    {(toneOfVoice.examples ?? []).map((ex, i) => (
                      <div key={i} className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-sm border ${
                        ex.type === 'good' ? 'bg-[#34D399]/10 border-[#34D399]/20 text-[#FAFAFA]' : 'bg-red-500/10 border-red-500/20 text-[#A1A1AA] line-through'
                      }`}>
                        <span className="flex-shrink-0 mt-0.5">{ex.type === 'good' ? '✅' : '❌'}</span>
                        {ex.text}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Component Affinities */}
          {componentAffinities.length > 0 && (
            <motion.div variants={itemVariants} className="bg-[#18181B] border border-[#3F3F46] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <Zap size={20} className="text-accent" />
                <h2 className="text-xl font-semibold text-[#FAFAFA]">Component Affinities</h2>
              </div>
              <p className="text-[#71717A] text-sm mb-6">
                ReactBits components most aligned with your saves — these will be prioritized when filling the Get Inspired canvas.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {componentAffinities.map((aff, i) => (
                  <motion.div
                    key={aff.key}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="flex items-start gap-3 p-4 bg-[#27272A] border border-[#3F3F46] rounded-xl hover:border-[#A78BFA]/40 transition-all group"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                      <Zap size={14} className="text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[#FAFAFA] text-sm font-semibold font-mono">{aff.key}</span>
                        <ConfidencePill value={aff.confidence} />
                      </div>
                      <p className="text-[#A1A1AA] text-xs leading-relaxed">{aff.reason}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              <p className="text-[#52525B] text-xs mt-4 flex items-center gap-1.5">
                <Link href="/get-inspired" className="text-accent hover:underline">Go to Get Inspired</Link>
                {' '}to generate a landing page using these components.
              </p>
            </motion.div>
          )}

          {/* Aesthetic Signature */}
          <motion.div
            variants={itemVariants}
            className="relative bg-[#18181B] rounded-2xl p-8 overflow-hidden"
          >
            <div className="absolute inset-0 rounded-2xl" style={{
              padding: 1,
              background: 'linear-gradient(135deg, #A78BFA44, #5E6AD244, transparent)',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
              pointerEvents: 'none',
              zIndex: 1,
            }} />

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-5">
                <Sparkles size={20} className="text-accent" />
                <h2 className="text-xl font-semibold text-[#FAFAFA]">Aesthetic Signature</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <p className="text-accent text-xs font-medium uppercase tracking-wider mb-2">Archetype</p>
                  <h3 className="text-3xl font-bold text-[#FAFAFA] mb-1">{aestheticSignature.archetype}</h3>
                  <p className="text-[#A78BFA] font-medium italic">{aestheticSignature.tagline}</p>
                  <p className="text-[#A1A1AA] text-sm leading-relaxed mt-4">{aestheticSignature.description}</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider mb-2">Influences</p>
                    <div className="flex flex-wrap gap-2">
                      {aestheticSignature.influences.map((inf) => (
                        <span key={inf} className="px-3 py-1.5 bg-[#27272A] border border-[#A78BFA]/30 rounded-lg text-[#A78BFA] text-sm">{inf}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider mb-2">Keywords</p>
                    <div className="flex flex-wrap gap-2">
                      {aestheticSignature.keywords.map((kw) => (
                        <span key={kw} className="px-3 py-1.5 bg-[#27272A] border border-[#3F3F46] rounded-lg text-[#FAFAFA] text-sm">{kw}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* ── Right: Export sidebar ──────────────────────────────────────────── */}
      <ExportSidebar brandDNA={brandDNA} inspirations={inspirations} />
    </div>
  )
}
