'use client'

/**
 * GetInspired — AI-powered landing page generator.
 *
 * One "Generate Page" button triggers a 3-call pipeline:
 *   Call 1 (gpt-4o-mini): brand-aware copy → ContentJSON
 *   Call 2 (no API):       Unsplash hero image URL
 *   Call 3 (gpt-4o):       raw JSX page composition
 *
 * The result is rendered live in Sandpack. Sections sidebar shows the
 * parsed components. Swap any via the Browse drawer. Export to ZIP.
 * Version history auto-saves after every generation.
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Sparkles,
  Download,
  Loader2,
  CheckCircle2,
  Clock,
  PanelLeftOpen,
  X,
  Wand2,
  Dna,
  History,
  Trash2,
  RotateCcw,
  AlertCircle,
} from 'lucide-react'
import JSZip from 'jszip'
import { usePlaygroundStore } from '@/src/stores/playgroundStore'
import { COMPONENT_MAP } from '@/src/playground/componentMap'
import { REGISTRY_MAP } from '@/src/playground/registry'
import { useBrandDNA } from '@/src/hooks/useBrandDNA'
import ComponentBrowser from './playground/ComponentBrowser'
import PlaygroundCanvas from './playground/PlaygroundCanvas'

// ── Generate-step labels (shown in the toolbar while loading) ─────────────────

const GENERATE_STEPS = [
  'Writing brand copy…',
  'Sourcing visuals…',
  'Composing layout…',
]

// ── Export helper ──────────────────────────────────────────────────────────────

async function exportGenerated(generatedPage) {
  const { jsx, content, heroImageUrl, usedComponents } = generatedPage
  const zip = new JSZip()
  const src = zip.folder('src')
  const components = src.folder('components')

  // Fetch component source for all used components
  const fetched = {}
  await Promise.all(
    usedComponents.map(async (name) => {
      const entry = COMPONENT_MAP[name]
      if (!entry) return
      const registryEntry = REGISTRY_MAP[entry.registryKey]
      if (!registryEntry) return
      const slug = name  // PascalCase
      try {
        const res = await fetch(`/api/reactbits?slug=${slug}-TS-TW.json`)
        if (!res.ok) return
        const json = await res.json()
        if (Array.isArray(json.files)) {
          for (const file of json.files) {
            const filename = (file.path ?? '').replace(/^\//, '')
            if (filename && file.content) components.file(filename, file.content)
          }
        }
        fetched[name] = slug
      } catch { /* skip */ }
    })
  )

  // Build imports
  const importLines = Object.entries(fetched)
    .map(([, slug]) => `import ${slug} from './components/${slug}'`)
    .join('\n')

  // Build full App.tsx (wrap the raw JSX)
  const appCode = `import React from 'react'
${importLines}
import './index.css'

export default function App() {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  return (
${jsx.split('\n').map((l) => `    ${l}`).join('\n')}
  )
}
`

  // CSS (basic brand variables; GPT controls the visual design)
  const indexCss = `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --brand-bg: #09090B;
  --brand-accent: #A78BFA;
  --brand-font-heading: 'Inter', system-ui, sans-serif;
  --brand-font-body: 'Inter', system-ui, sans-serif;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  background: var(--brand-bg);
  font-family: var(--brand-font-body);
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}
h1, h2, h3, h4 { font-family: var(--brand-font-heading); }
`

  const tailwindConfig = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx,js,jsx}'],
  theme: { extend: {} },
  plugins: [],
}
`

  const brandName = content?.companyName ?? 'my-brand'
  const brandKit = JSON.stringify({
    generatedBy: 'tAIste — AI Brand DNA Builder',
    generatedAt: new Date().toISOString(),
    brand: { name: brandName },
    heroImage: heroImageUrl,
    content,
    usage: 'Paste brand-kit.json into Claude, Cursor, or Lovable to keep your brand consistent.',
  }, null, 2)

  src.file('App.tsx', appCode)
  src.file('index.css', indexCss)
  src.file('main.tsx', `import React from 'react'\nimport { createRoot } from 'react-dom/client'\nimport './index.css'\nimport App from './App'\ncreateRoot(document.getElementById('root')!).render(<App />)\n`)

  zip.file('package.json', JSON.stringify({
    name: brandName.toLowerCase().replace(/\s+/g, '-') || 'landing-page',
    version: '0.1.0',
    scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
    dependencies: { react: '^18', 'react-dom': '^18', gsap: '^3', 'framer-motion': '^11', three: '^0.160', '@react-three/fiber': '^8', '@react-three/drei': '^9' },
    devDependencies: { typescript: '^5', vite: '^5', '@vitejs/plugin-react': '^4', tailwindcss: '^3', autoprefixer: '^10', postcss: '^8' },
  }, null, 2))
  zip.file('vite.config.ts', `import { defineConfig } from 'vite'\nimport react from '@vitejs/plugin-react'\nexport default defineConfig({ plugins: [react()] })\n`)
  zip.file('tailwind.config.js', tailwindConfig)
  zip.file('brand-kit.json', brandKit)
  zip.file('index.html', `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>${brandName}</title>\n</head>\n<body>\n  <div id="root"></div>\n  <script type="module" src="/src/main.tsx"></script>\n</body>\n</html>\n`)
  zip.file('README.md', `# ${brandName}\n\nGenerated by [tAIste](https://t-a-iste.vercel.app).\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n`)

  const blob = await zip.generateAsync({ type: 'blob' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${brandName.toLowerCase().replace(/\s+/g, '-') || 'landing-page'}-export.zip`
  a.click()
  URL.revokeObjectURL(url)
}

// ── GetInspired ────────────────────────────────────────────────────────────────

export default function GetInspired() {
  const isBrowserOpen      = usePlaygroundStore((s) => s.isBrowserOpen)
  const openBrowser        = usePlaygroundStore((s) => s.openBrowser)
  const generatedPage      = usePlaygroundStore((s) => s.generatedPage)
  const isGenerating       = usePlaygroundStore((s) => s.isGenerating)
  const generateError      = usePlaygroundStore((s) => s.generateError)
  const generateStep       = usePlaygroundStore((s) => s.generateStep)
  const setGeneratedPage   = usePlaygroundStore((s) => s.setGeneratedPage)
  const setIsGenerating    = usePlaygroundStore((s) => s.setIsGenerating)
  const setGenerateError   = usePlaygroundStore((s) => s.setGenerateError)
  const setGenerateStep    = usePlaygroundStore((s) => s.setGenerateStep)
  const isDirty            = usePlaygroundStore((s) => s.isDirty)
  const lastSaved          = usePlaygroundStore((s) => s.lastSaved)
  const snapshots          = usePlaygroundStore((s) => s.snapshots)
  const snapshotsLoading   = usePlaygroundStore((s) => s.snapshotsLoading)
  const fetchSnapshots     = usePlaygroundStore((s) => s.fetchSnapshots)
  const saveSnapshot       = usePlaygroundStore((s) => s.saveSnapshot)
  const restoreSnapshot    = usePlaygroundStore((s) => s.restoreSnapshot)
  const deleteSnapshot     = usePlaygroundStore((s) => s.deleteSnapshot)

  const { activeBrandDNA } = useBrandDNA()
  const activeDnaName = activeBrandDNA?.name ?? null

  const [showHistory, setShowHistory] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState(null)
  const stepIdxRef = useRef(0)

  // Load saved canvas on mount + fetch snapshot history
  useEffect(() => {
    fetch('/api/playground')
      .then((r) => r.json())
      .then((json) => {
        const packed = json.items?.[0]
        if (packed?.jsx) {
          setGeneratedPage({
            jsx                : packed.jsx,
            backgroundComponent: packed.backgroundComponent ?? 'Particles',
            content            : packed.content,
            heroImageUrl       : packed.heroImageUrl,
            usedComponents     : packed.usedComponents ?? [],
            brandDnaName       : packed.brandDnaName,
          })
        }
      })
      .catch(() => {/* silent */})
    fetchSnapshots()
  }, [setGeneratedPage, fetchSnapshots])

  // Generate page
  const handleGenerate = useCallback(async () => {
    setIsGenerating(true)
    setGenerateError(null)

    // Cycle through step labels
    stepIdxRef.current = 0
    setGenerateStep(GENERATE_STEPS[0])
    const stepInterval = setInterval(() => {
      stepIdxRef.current = (stepIdxRef.current + 1) % GENERATE_STEPS.length
      setGenerateStep(GENERATE_STEPS[stepIdxRef.current])
    }, 4000)

    try {
      const res  = await fetch('/api/playground/generate', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Generation failed')

      const page = {
        jsx                : json.jsx,
        backgroundComponent: json.backgroundComponent ?? 'Particles',
        content            : json.content,
        heroImageUrl       : json.heroImageUrl,
        usedComponents     : json.usedComponents ?? [],
        brandDnaName       : json.brandDnaName,
      }
      setGeneratedPage(page)

      // Auto-save snapshot
      const label = `${json.content?.companyName ?? 'Page'} — ${new Date().toLocaleTimeString()}`
      await saveSnapshot(label)
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      clearInterval(stepInterval)
      setIsGenerating(false)
      setGenerateStep(null)
    }
  }, [setGeneratedPage, setIsGenerating, setGenerateError, setGenerateStep, saveSnapshot])

  const handleExport = async () => {
    if (!generatedPage) return
    setIsExporting(true)
    setExportError(null)
    try {
      await exportGenerated(generatedPage)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const saveStatus = isDirty ? 'unsaved' : lastSaved ? 'saved' : 'idle'

  return (
    <div className="flex flex-col h-full bg-[#09090B]">
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#3F3F46] bg-[#0E0E10] flex-shrink-0 flex-wrap">

        {/* Browse toggle */}
        <button
          onClick={() => openBrowser()}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            isBrowserOpen
              ? 'bg-[#5227FF]/20 text-[#B17BFF] border border-[#5227FF]/40'
              : 'bg-[#111113] text-[#A1A1AA] border border-[#3F3F46] hover:border-[#5227FF]/40 hover:text-[#FAFAFA]'
          }`}
        >
          <PanelLeftOpen size={13} />
          Browse
        </button>

        {/* Generate Page */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#5227FF] to-[#7C3AED] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isGenerating
            ? <Loader2 size={13} className="animate-spin" />
            : <Sparkles size={13} />}
          {isGenerating ? (generateStep ?? 'Generating…') : 'Generate Page'}
        </button>

        {/* History */}
        <button
          onClick={() => setShowHistory((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            showHistory
              ? 'bg-[#5227FF]/20 text-[#B17BFF] border border-[#5227FF]/40'
              : 'bg-[#111113] text-[#A1A1AA] border border-[#3F3F46] hover:border-[#5227FF]/40 hover:text-[#FAFAFA]'
          }`}
          title="Version history"
        >
          <History size={13} />
          History
          {snapshots.length > 0 && (
            <span
              className="ml-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
              style={{ background: '#5227FF33', color: '#B17BFF' }}
            >
              {snapshots.length}
            </span>
          )}
        </button>

        {/* Active DNA indicator */}
        {activeDnaName && !isGenerating && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-[#111113] border border-[#3F3F46]">
            <Dna size={11} className="text-[#A78BFA]" />
            <span className="text-[#71717A]">DNA:</span>
            <span className="text-[#FAFAFA] font-medium">{activeDnaName}</span>
          </div>
        )}

        {/* AI generating indicator */}
        {isGenerating && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#B17BFF] bg-[#5227FF]/10 border border-[#5227FF]/30">
            <Wand2 size={13} className="animate-pulse" />
            {activeDnaName ? `Building with ${activeDnaName}…` : 'Building your page…'}
          </div>
        )}

        <div className="flex-1" />

        {/* Save status */}
        <div className="flex items-center gap-1.5 text-xs text-[#52525B]">
          {saveStatus === 'unsaved' && <Clock size={12} className="text-amber-500" />}
          {saveStatus === 'saved'   && <CheckCircle2 size={12} className="text-emerald-500" />}
          <span>
            {saveStatus === 'unsaved' && 'Saving…'}
            {saveStatus === 'saved'   && `Saved ${lastSaved.toLocaleTimeString()}`}
            {saveStatus === 'idle'    && 'No changes'}
          </span>
        </div>

        {/* Export */}
        <button
          onClick={handleExport}
          disabled={isExporting || !generatedPage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#111113] text-[#A1A1AA] border border-[#3F3F46] hover:border-emerald-500/40 hover:text-emerald-400 transition-all disabled:opacity-40"
          title={!generatedPage ? 'Generate a page first' : 'Download ZIP — ready to push to GitHub'}
        >
          {isExporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          Export
        </button>
      </div>

      {/* ── Error banners ─────────────────────────────────────────────────────── */}
      {exportError && (
        <div className="px-4 py-2 text-xs text-red-400 bg-red-900/10 border-b border-red-900/20 flex items-center gap-2">
          <AlertCircle size={12} />
          Export error: {exportError}
          <button onClick={() => setExportError(null)} className="ml-auto hover:text-white">
            <X size={12} />
          </button>
        </div>
      )}
      {generateError && (
        <div className="px-4 py-2 text-xs text-amber-400 bg-amber-900/10 border-b border-amber-900/20 flex items-center gap-2">
          <AlertCircle size={12} />
          Generation error: {generateError}
          <button onClick={() => setGenerateError(null)} className="ml-auto hover:text-white">
            <X size={12} />
          </button>
        </div>
      )}

      {/* ── Main 2-panel area ────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">
        <AnimatePresence>{isBrowserOpen && <ComponentBrowser />}</AnimatePresence>
        <PlaygroundCanvas />

        {/* ── History slide-in panel ── */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="absolute top-0 right-0 bottom-0 w-72 flex flex-col z-30"
              style={{ background: '#0E0E10', borderLeft: '1px solid #27272A', boxShadow: '-8px 0 32px rgba(0,0,0,0.5)' }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#1F1F23]">
                <div>
                  <h3 className="text-sm font-semibold text-[#FAFAFA]">Version History</h3>
                  <p className="text-[10px] text-[#52525B] mt-0.5">Auto-saved on every generation</p>
                </div>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-[#52525B] hover:text-[#FAFAFA] transition-colors p-1 rounded"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-2">
                {snapshotsLoading && (
                  <div className="flex items-center justify-center py-8 gap-2 text-[#52525B] text-xs">
                    <Loader2 size={13} className="animate-spin" />
                    Loading history…
                  </div>
                )}

                {!snapshotsLoading && snapshots.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-[#3F3F46]">
                    <History size={22} />
                    <p className="text-xs text-center px-6 leading-relaxed">
                      No snapshots yet. History saves automatically after every generation.
                    </p>
                  </div>
                )}

                {snapshots.map((snap) => {
                  const packed = snap.items?.[0]
                  const compCount = packed?.usedComponents?.length ?? 0
                  return (
                    <div
                      key={snap.id}
                      className="group flex items-start gap-3 px-4 py-3 hover:bg-[#18181B] transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#D4D4D8] truncate">{snap.label}</p>
                        <p className="text-[10px] text-[#52525B] mt-0.5">
                          {new Date(snap.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          {' · '}
                          {new Date(snap.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {compCount > 0 && (
                          <p className="text-[10px] text-[#3F3F46] mt-0.5">
                            {compCount} component{compCount !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                        <button
                          onClick={() => { restoreSnapshot(snap); setShowHistory(false) }}
                          className="p-1.5 rounded-md text-[#71717A] hover:text-[#B17BFF] hover:bg-[#5227FF]/10 transition-colors"
                          title="Restore this version"
                        >
                          <RotateCcw size={12} />
                        </button>
                        <button
                          onClick={() => deleteSnapshot(snap.id)}
                          className="p-1.5 rounded-md text-[#71717A] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete snapshot"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="px-4 py-3 border-t border-[#1F1F23]">
                <button
                  onClick={() => saveSnapshot(`Manual save — ${new Date().toLocaleTimeString()}`)}
                  disabled={!generatedPage}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#18181B] text-[#A1A1AA] border border-[#3F3F46] hover:border-[#5227FF]/40 hover:text-[#FAFAFA] transition-all disabled:opacity-40"
                >
                  <History size={12} />
                  Save current state
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
