'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Link2, Upload, Check, Loader2, Plus, Image as ImageIcon } from 'lucide-react'
import { useUIStore } from '../../store/uiStore'
import { useInspirations } from '../../hooks/useInspirations'
import { useFolders } from '../../hooks/useFolders'

const LOADING_STEPS = [
  'Fetching page...',
  'Extracting visual elements...',
  'Analyzing patterns...',
  'Generating insights...',
]

const FALLBACK_ANALYSIS = {
  dominantColors: [
    { hex: '#0A0A0F', name: 'Void Black', percentage: 45 },
    { hex: '#A78BFA', name: 'Soft Violet', percentage: 25 },
    { hex: '#FAFAFA', name: 'Clean White', percentage: 20 },
    { hex: '#5E6AD2', name: 'Linear Purple', percentage: 10 },
  ],
  mood: ['minimal', 'premium', 'technical'],
  visualWeight: 'heavy',
  typographyStyle: 'geometric sans-serif',
  layoutPattern: 'centered hero with feature grid',
  suggestedTags: ['minimal', 'saas'],
}

const UNSPLASH_FALLBACKS = [
  'https://images.unsplash.com/photo-1618788372246-79faff0c3742?w=400&q=80',
  'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&q=80',
  'https://images.unsplash.com/photo-1620825937374-87fc7d6bddc2?w=400&q=80',
  'https://images.unsplash.com/photo-1651727366310-7c866e7c9b2a?w=400&q=80',
]

function getSuggestedTags(url) {
  const lower = url.toLowerCase()
  const tags = []
  if (lower.includes('dribbble') || lower.includes('behance')) tags.push('ui-design')
  if (lower.includes('figma') || lower.includes('design')) tags.push('design-system')
  if (lower.includes('github') || lower.includes('vercel') || lower.includes('linear')) {
    tags.push('developer-tools', 'dark-ui')
  }
  if (lower.includes('fashion') || lower.includes('vogue')) tags.push('editorial', 'fashion')
  if (lower.includes('apple') || lower.includes('luxury')) tags.push('premium', 'product-photography')
  if (tags.length === 0) tags.push('minimal', 'saas')
  return tags
}

export default function SaveModal() {
  const { saveModalOpen, closeSaveModal } = useUIStore()
  const { addInspiration } = useInspirations()
  const { folders } = useFolders()

  const [tab, setTab] = useState('url')
  const [url, setUrl] = useState('')
  const [loadStep, setLoadStep] = useState(-1)
  const [showResult, setShowResult] = useState(false)
  const [tags, setTags] = useState([])
  const [newTag, setNewTag] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedFolderId, setSelectedFolderId] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploadedImage, setUploadedImage] = useState(null)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [screenshotUrl, setScreenshotUrl] = useState(null)
  const [analyzeError, setAnalyzeError] = useState(null)
  const [pageTitle, setPageTitle] = useState(null)
  const fileRef = useRef()

  const reset = () => {
    setUrl('')
    setLoadStep(-1)
    setShowResult(false)
    setTags([])
    setNewTag('')
    setNotes('')
    setSelectedFolderId(null)
    setUploadedImage(null)
    setAnalysisResult(null)
    setScreenshotUrl(null)
    setAnalyzeError(null)
    setPageTitle(null)
    setTab('url')
  }

  const handleClose = () => {
    closeSaveModal()
    setTimeout(reset, 300)
  }

  const runAnalysis = async () => {
    setLoadStep(0)
    setAnalyzeError(null)

    // Start the real API call immediately
    const apiPromise = tab === 'url'
      ? fetch('/api/analyze/url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        }).then((r) => r.json())
      : fetch('/api/analyze/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageData: uploadedImage }),
        }).then((r) => r.json())

    // Advance through fake steps while API runs
    for (let i = 1; i < LOADING_STEPS.length; i++) {
      await new Promise((r) => setTimeout(r, 600))
      setLoadStep(i)
    }

    try {
      const result = await apiPromise
      setLoadStep(LOADING_STEPS.length)
      if (result.error) throw new Error(result.error)
      setAnalysisResult(result.analysis)
      if (result.screenshotUrl) setScreenshotUrl(result.screenshotUrl)
      if (result.title) setPageTitle(result.title)
      setTags(result.analysis?.suggestedTags ?? getSuggestedTags(tab === 'url' ? url : 'upload'))
    } catch (err) {
      setAnalyzeError('AI analysis unavailable — saving with basic info.')
      setAnalysisResult(FALLBACK_ANALYSIS)
      setTags(getSuggestedTags(tab === 'url' ? url : 'upload'))
    }

    setShowResult(true)
  }

  const handleSave = async () => {
    let imageUrl = screenshotUrl || uploadedImage || UNSPLASH_FALLBACKS[Math.floor(Math.random() * UNSPLASH_FALLBACKS.length)]

    // Persist Microlink screenshot to Supabase so it never rots as a third-party URL
    if (tab === 'url' && screenshotUrl) {
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: screenshotUrl }),
        })
        const result = await res.json()
        if (result.url) imageUrl = result.url
      } catch (_) { /* keep original screenshotUrl as fallback */ }
    }

    // Upload base64 image to Supabase Storage
    if (uploadedImage?.startsWith('data:')) {
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageData: uploadedImage }),
        })
        const result = await res.json()
        if (result.url) imageUrl = result.url
      } catch (_) { /* fall through with base64 */ }
    }

    const domain = tab === 'url' && url ? new URL(url.startsWith('http') ? url : 'https://' + url).hostname : 'upload'
    const item = {
      id: `user-${Date.now()}`,
      title: pageTitle || (domain !== 'upload' ? `Saved from ${domain}` : 'Uploaded Image'),
      sourceUrl: tab === 'url' ? url : '',
      sourceDomain: domain,
      sourceType: tab === 'url' ? 'website' : 'upload',
      imageUrl,
      tags,
      savedAt: new Date().toISOString(),
      notes,
      folderId: selectedFolderId ?? null,
      analysis: analysisResult || FALLBACK_ANALYSIS,
    }
    await addInspiration(item)
    handleClose()
  }

  const addTag = () => {
    const t = newTag.trim().toLowerCase().replace(/\s+/g, '-')
    if (t && !tags.includes(t)) setTags([...tags, t])
    setNewTag('')
  }

  const handleFileDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer?.files?.[0] || e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (ev) => setUploadedImage(ev.target.result)
      reader.readAsDataURL(file)
    }
  }

  return (
    <AnimatePresence>
      {saveModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="relative w-full max-w-lg bg-[#18181B] border border-[#3F3F46] rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#3F3F46]">
              <div>
                <h2 className="text-[#FAFAFA] font-semibold text-lg">Save Inspiration</h2>
                <p className="text-[#A1A1AA] text-sm mt-0.5">Add to your visual swipe file</p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A] transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              {/* Tabs */}
              {!showResult && loadStep === -1 && (
                <div className="flex gap-1 bg-[#27272A] p-1 rounded-xl mb-6">
                  {['url', 'upload'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                        tab === t
                          ? 'bg-[#3F3F46] text-[#FAFAFA]'
                          : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
                      }`}
                    >
                      {t === 'url' ? <Link2 size={15} /> : <Upload size={15} />}
                      {t === 'url' ? 'Paste URL' : 'Upload Image'}
                    </button>
                  ))}
                </div>
              )}

              {/* Loading state */}
              {loadStep >= 0 && !showResult && (
                <div className="py-4">
                  <div className="flex items-center gap-3 mb-6">
                    <Loader2 size={20} className="text-accent animate-spin" />
                    <span className="text-[#FAFAFA] font-medium">Analyzing...</span>
                  </div>
                  <div className="space-y-3">
                    {LOADING_STEPS.map((step, i) => (
                      <motion.div
                        key={step}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: loadStep > i ? 1 : 0.3, x: 0 }}
                        className="flex items-center gap-3 text-sm"
                      >
                        {loadStep > i ? (
                          <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center flex-shrink-0">
                            <Check size={12} className="text-white" />
                          </div>
                        ) : loadStep === i ? (
                          <Loader2 size={20} className="text-accent animate-spin flex-shrink-0" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-[#3F3F46] flex-shrink-0" />
                        )}
                        <span className={loadStep > i ? 'text-[#FAFAFA]' : 'text-[#A1A1AA]'}>{step}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* URL Input */}
              {tab === 'url' && !showResult && loadStep === -1 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[#A1A1AA] text-sm mb-2 block">Page URL</label>
                    <input
                      type="url"
                      placeholder="https://example.com"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && url && runAnalysis()}
                      className="w-full bg-[#27272A] border border-[#3F3F46] rounded-xl px-4 py-3 text-[#FAFAFA] placeholder-[#A1A1AA] text-sm focus:outline-none focus:border-[#A78BFA] focus:ring-1 focus:ring-[#A78BFA]/30 transition-all"
                      autoFocus
                    />
                  </div>
                  <motion.button
                    onClick={runAnalysis}
                    disabled={!url.trim()}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-4 py-3 text-sm transition-colors"
                  >
                    Analyze
                  </motion.button>
                </div>
              )}

              {/* Upload input */}
              {tab === 'upload' && !showResult && loadStep === -1 && (
                <div className="space-y-4">
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleFileDrop}
                    onClick={() => fileRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all ${
                      dragOver || uploadedImage
                        ? 'border-accent bg-accent/5'
                        : 'border-[#3F3F46] hover:border-[#52525B]'
                    }`}
                  >
                    {uploadedImage ? (
                      <img src={uploadedImage} className="w-full h-32 object-cover rounded-lg" alt="Preview" />
                    ) : (
                      <>
                        <ImageIcon size={32} className="text-[#A1A1AA]" />
                        <div className="text-center">
                          <p className="text-[#FAFAFA] text-sm font-medium">Drop image here</p>
                          <p className="text-[#A1A1AA] text-xs mt-1">or click to browse</p>
                        </div>
                      </>
                    )}
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileDrop}
                      className="hidden"
                    />
                  </div>
                  <motion.button
                    onClick={runAnalysis}
                    disabled={!uploadedImage}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-4 py-3 text-sm transition-colors"
                  >
                    Analyze Image
                  </motion.button>
                </div>
              )}

              {/* Analysis Result */}
              {showResult && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-5"
                >
                  {/* Screenshot / image preview */}
                  {(screenshotUrl || uploadedImage) && (
                    <div className="rounded-xl overflow-hidden border border-[#3F3F46] aspect-video bg-[#27272A]">
                      <img
                        src={screenshotUrl || uploadedImage}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Title preview */}
                  {pageTitle && (
                    <p className="text-[#FAFAFA] text-sm font-medium truncate">{pageTitle}</p>
                  )}
                  {/* Colors */}
                  <div>
                    <p className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider mb-2">Extracted Colors</p>
                    <div className="flex gap-2">
                      {(analysisResult?.dominantColors ?? []).map((c) => (
                        <div key={c.hex} className="flex flex-col items-center gap-1">
                          <div
                            className="w-8 h-8 rounded-lg border border-[#3F3F46]"
                            style={{ background: c.hex }}
                            title={c.name}
                          />
                          <span className="text-[#A1A1AA] text-[10px] font-mono">{c.hex}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mood */}
                  <div>
                    <p className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider mb-2">Mood</p>
                    <div className="flex flex-wrap gap-2">
                      {(analysisResult?.mood ?? []).map((m) => (
                        <span key={m} className="px-2.5 py-1 bg-[#27272A] border border-[#3F3F46] rounded-lg text-[#A1A1AA] text-xs">{m}</span>
                      ))}
                    </div>
                  </div>

                  {/* Error notice */}
                  {analyzeError && (
                    <p className="text-amber-400 text-xs">{analyzeError}</p>
                  )}

                  {/* Tags */}
                  <div>
                    <p className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {tags.map((t) => (
                        <span
                          key={t}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-accent/20 border border-accent/40 rounded-lg text-accent text-xs cursor-pointer hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400 transition-all"
                          onClick={() => setTags(tags.filter((x) => x !== t))}
                        >
                          {t} <X size={10} />
                        </span>
                      ))}
                      <div className="flex gap-1">
                        <input
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addTag()}
                          placeholder="+ add tag"
                          className="bg-transparent text-xs text-[#A1A1AA] placeholder-[#52525B] focus:outline-none w-20"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider mb-2 block">Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="What caught your eye about this..."
                      rows={2}
                      className="w-full bg-[#27272A] border border-[#3F3F46] rounded-xl px-3 py-2.5 text-sm text-[#FAFAFA] placeholder-[#A1A1AA] focus:outline-none focus:border-[#A78BFA] transition-all resize-none"
                    />
                  </div>

                  {/* Folder */}
                  {folders && folders.length > 0 && (
                    <div>
                      <label className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider mb-2 block">Save to Folder</label>
                      <select
                        value={selectedFolderId ?? ''}
                        onChange={(e) => setSelectedFolderId(e.target.value || null)}
                        className="w-full bg-[#27272A] border border-[#3F3F46] rounded-xl px-3 py-2.5 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#A78BFA] transition-all appearance-none cursor-pointer"
                      >
                        <option value="">No Folder</option>
                        {folders.map((f) => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <motion.button
                    onClick={handleSave}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full bg-accent hover:bg-accent-hover text-white font-semibold rounded-xl px-4 py-3 text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Check size={16} />
                    Save to Swipe File
                  </motion.button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
