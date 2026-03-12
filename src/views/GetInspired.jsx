'use client'

/**
 * GetInspired — the "Get Inspired" playground view.
 *
 * First-run flow:
 *   If canvas is empty after load → show fullscreen template picker.
 *   User picks template → scaffoldTemplate() → AI fills slots via /api/playground/fill-template.
 *
 * Top bar:
 *   Browse | AI Recommend | Templates | ──── | Export | save status
 */

import { useEffect, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Layout,
  Sparkles,
  BookTemplate,
  Download,
  Loader2,
  CheckCircle2,
  Clock,
  PanelLeftOpen,
  X,
  Wand2,
} from 'lucide-react'
import JSZip from 'jszip'
import { usePlaygroundStore } from '@/src/stores/playgroundStore'
import { REGISTRY_MAP } from '@/src/playground/registry'
import { POSITION_TEMPLATES, scaffoldTemplate } from '@/src/playground/templates'
import ComponentBrowser from './playground/ComponentBrowser'
import PlaygroundCanvas from './playground/PlaygroundCanvas'
import PropsEditor from './playground/PropsEditor'

// ── Export helper ──────────────────────────────────────────────────────────────

async function exportCanvas(canvasItems, canvasSections) {
  const zip = new JSZip()
  const src = zip.folder('src')
  const components = src.folder('components')

  const keys = [...new Set(canvasItems.filter((i) => i.componentKey).map((i) => i.componentKey))]

  // Collect component source via the /api/reactbits proxy (avoids CORS)
  const fetched = {}
  await Promise.all(
    keys.map(async (key) => {
      const entry = REGISTRY_MAP[key]
      if (!entry) return
      const slug = key.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('')
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
        fetched[key] = slug
      } catch { /* skip */ }
    })
  )

  // Build App.tsx — section-based if sections exist, flat otherwise
  const sortedItems = [...canvasItems].filter((i) => i.visible !== false && i.componentKey)
    .sort((a, b) => a.order - b.order)

  const usedKeys = [...new Set(sortedItems.map((i) => i.componentKey).filter((k) => fetched[k]))]
  const importLines = usedKeys
    .map((key) => {
      const slug = fetched[key]
      return slug ? `import ${slug} from './components/${slug}'` : ''
    })
    .filter(Boolean)
    .join('\n')

  let bodyCode = ''

  if (canvasSections.length > 0) {
    const sortedSections = [...canvasSections].sort((a, b) => a.order - b.order)
    const sectionCode = sortedSections.map((section) => {
      const sectionItems = sortedItems.filter((i) => i.sectionId === section.id)
      if (sectionItems.length === 0) return ''
      const bgItems      = sectionItems.filter((i) => i.slotType === 'background')
      const contentItems = sectionItems.filter((i) => i.slotType !== 'background')

      const itemCode = [
        ...bgItems.map((item) => {
          const slug = fetched[item.componentKey]
          if (!slug) return ''
          const ps = serializePropsExport(item.props)
          return `        <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>\n          <${slug} ${ps} />\n        </div>`
        }),
        ...contentItems.map((item) => {
          const slug = fetched[item.componentKey]
          if (!slug) return ''
          const ps = serializePropsExport(item.props)
          const style = slotPosToStyleExport(item.slotPosition ?? {}, 1)
          return `        <div style={${style}}>\n          <${slug} ${ps} />\n        </div>`
        }),
      ].filter(Boolean).join('\n')

      return `      <section style={{ position: 'relative', height: '${section.heightVh}vh', overflow: 'hidden' }}>\n${itemCode}\n      </section>`
    }).filter(Boolean).join('\n')

    bodyCode = `    <div style={{ background: '#09090B' }}>\n${sectionCode}\n    </div>`
  } else {
    const rows = sortedItems.map((item) => {
      const slug = fetched[item.componentKey]
      if (!slug) return ''
      const ps = serializePropsExport(item.props)
      const w = item.layoutHint === 'half' ? 'w-1/2' : 'w-full'
      return `      <div className="${w}">\n        <${slug} ${ps} />\n      </div>`
    }).filter(Boolean).join('\n')
    bodyCode = `    <div className="flex flex-col gap-8 min-h-screen bg-[#09090B] p-8">\n      <div className="flex flex-wrap gap-4">\n${rows}\n      </div>\n    </div>`
  }

  const appCode = `import React from 'react'
${importLines}
import './index.css'

export default function App() {
  return (
${bodyCode}
  )
}
`

  src.file('App.tsx', appCode)
  src.file('index.css', `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n* { box-sizing: border-box; margin: 0; padding: 0; }\nbody { background: #09090B; }\n`)
  src.file('main.tsx', `import React from 'react'\nimport { createRoot } from 'react-dom/client'\nimport './index.css'\nimport App from './App'\ncreateRoot(document.getElementById('root')!).render(<App />)\n`)

  zip.file('package.json', JSON.stringify({
    name: 'my-playground-export',
    version: '0.1.0',
    scripts: { dev: 'vite', build: 'vite build' },
    dependencies: { react: '^18', 'react-dom': '^18', gsap: '^3', 'framer-motion': '^11', three: '^0.160', '@react-three/fiber': '^8', '@react-three/drei': '^9' },
    devDependencies: { typescript: '^5', vite: '^5', '@vitejs/plugin-react': '^4', tailwindcss: '^3', autoprefixer: '^10', postcss: '^8' },
  }, null, 2))
  zip.file('vite.config.ts', `import { defineConfig } from 'vite'\nimport react from '@vitejs/plugin-react'\nexport default defineConfig({ plugins: [react()] })\n`)
  zip.file('tailwind.config.js', `module.exports = { content: ['./src/**/*.{ts,tsx}'], theme: { extend: {} }, plugins: [] }\n`)
  zip.file('index.html', `<!DOCTYPE html>\n<html lang="en">\n<head><meta charset="UTF-8" /><title>Playground Export</title></head>\n<body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>\n</html>\n`)
  zip.file('README.md', `# Playground Export\n\nGenerated from tAIste.\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n`)

  const blob = await zip.generateAsync({ type: 'blob' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = 'playground-export.zip'
  a.click()
  URL.revokeObjectURL(url)
}

function serializePropsExport(props) {
  return Object.entries(props).map(([k, v]) => {
    if (typeof v === 'string') return `${k}="${v}"`
    if (typeof v === 'boolean') return v ? k : `${k}={false}`
    if (typeof v === 'number') return `${k}={${v}}`
    return `${k}={${JSON.stringify(v)}}`
  }).join(' ')
}

function slotPosToStyleExport(pos, zIndex) {
  const parts = [`position: 'absolute'`, `zIndex: ${zIndex}`]
  if (pos.top       != null) parts.push(`top: '${pos.top}'`)
  if (pos.bottom    != null) parts.push(`bottom: '${pos.bottom}'`)
  if (pos.left      != null) parts.push(`left: '${pos.left}'`)
  if (pos.right     != null) parts.push(`right: '${pos.right}'`)
  if (pos.width     != null) parts.push(`width: '${pos.width}'`)
  if (pos.transform != null) parts.push(`transform: '${pos.transform}'`)
  if (pos.textAlign != null) parts.push(`textAlign: '${pos.textAlign}'`)
  return `{ ${parts.join(', ')} }`
}

// ── Template Picker ────────────────────────────────────────────────────────────

function TemplatePicker({ onClose, onSelect, isCloseable }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      onClick={isCloseable ? onClose : undefined}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#0E0E10] border border-[#3F3F46] rounded-2xl p-6 w-full max-w-3xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-xl font-bold text-[#FAFAFA]">Choose a Template</h2>
            <p className="text-sm text-[#71717A] mt-1">
              Pick a layout — AI will fill each slot with components matching your Brand DNA.
            </p>
          </div>
          {isCloseable && (
            <button onClick={onClose} className="text-[#71717A] hover:text-[#FAFAFA] ml-4">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
          {POSITION_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              className="text-left p-4 rounded-xl border border-[#3F3F46] hover:border-[#5227FF]/60 bg-[#0A0A0C] hover:bg-[#111118] transition-all group"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-[#FAFAFA] group-hover:text-[#B17BFF] transition-colors">
                  {t.name}
                </p>
                <span className="text-[10px] text-[#52525B] border border-[#3F3F46] rounded px-1.5 py-0.5 flex-shrink-0">
                  {t.sections.length} sections
                </span>
              </div>
              <p className="text-xs text-[#71717A] mt-1 leading-relaxed">{t.wireframeHint}</p>
              <div className="flex flex-wrap gap-1 mt-2.5">
                {t.tags.map((tag) => (
                  <span key={tag} className="px-1.5 py-0.5 text-[10px] rounded bg-[#1A1A1F] text-[#52525B] border border-[#3F3F46]">
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── GetInspired shell ──────────────────────────────────────────────────────────

export default function GetInspired() {
  const isBrowserOpen       = usePlaygroundStore((s) => s.isBrowserOpen)
  const openBrowser         = usePlaygroundStore((s) => s.openBrowser)
  const isRecommending      = usePlaygroundStore((s) => s.isRecommending)
  const setIsRecommending   = usePlaygroundStore((s) => s.setIsRecommending)
  const isFilling           = usePlaygroundStore((s) => s.isFilling)
  const setIsFilling        = usePlaygroundStore((s) => s.setIsFilling)
  const isDirty             = usePlaygroundStore((s) => s.isDirty)
  const lastSaved           = usePlaygroundStore((s) => s.lastSaved)
  const canvasItems         = usePlaygroundStore((s) => s.canvasItems)
  const canvasSections      = usePlaygroundStore((s) => s.canvasSections)
  const addItem             = usePlaygroundStore((s) => s.addItem)
  const setCanvasItems      = usePlaygroundStore((s) => s.setCanvasItems)
  const setCanvasSections   = usePlaygroundStore((s) => s.setCanvasSections)
  const applyTemplateFill   = usePlaygroundStore((s) => s.applyTemplateFill)

  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [isFirstRun, setIsFirstRun]                 = useState(false)
  const [isExporting, setIsExporting]               = useState(false)
  const [exportError, setExportError]               = useState(null)
  const [fillError, setFillError]                   = useState(null)
  const [loadingDone, setLoadingDone]               = useState(false)

  // Load saved canvas + sections on mount
  useEffect(() => {
    fetch('/api/playground')
      .then((r) => r.json())
      .then((json) => {
        if (Array.isArray(json.items) && json.items.length > 0) {
          setCanvasItems(json.items)
          if (Array.isArray(json.sections) && json.sections.length > 0) {
            setCanvasSections(json.sections)
          }
        } else {
          // Empty canvas → first run, show template picker
          setIsFirstRun(true)
          setShowTemplatePicker(true)
        }
      })
      .catch(() => {
        setIsFirstRun(true)
        setShowTemplatePicker(true)
      })
      .finally(() => setLoadingDone(true))
  }, [setCanvasItems, setCanvasSections])

  // Apply a template: scaffold empty slots, then call AI to fill them
  const handleSelectTemplate = useCallback(async (templateId) => {
    const template = POSITION_TEMPLATES.find((t) => t.id === templateId)
    if (!template) return

    // Scaffold empty slot structure
    const { sections, items } = scaffoldTemplate(template)
    setCanvasSections(sections)
    setCanvasItems(items)
    setShowTemplatePicker(false)
    setFillError(null)

    // Ask AI to fill the slots
    setIsFilling(true)
    try {
      const res  = await fetch('/api/playground/fill-template', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ templateId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Fill failed')
      if (Array.isArray(json.fills) && json.fills.length > 0) {
        applyTemplateFill(json.fills)
      }
      // Merge scaffold content (brandName, subtitle, CTAs) into each section
      if (Array.isArray(json.sectionScaffolds) && json.sectionScaffolds.length > 0) {
        const updatedSections = sections.map((s) => {
          const scaffold = json.sectionScaffolds.find((sc) => sc.sectionId === s.id)
          if (!scaffold) return s
          const { sectionId: _, ...rest } = scaffold
          return { ...s, ...rest }
        })
        setCanvasSections(updatedSections)
      }
    } catch (err) {
      setFillError(err instanceof Error ? err.message : 'AI fill failed')
    } finally {
      setIsFilling(false)
    }
  }, [setCanvasSections, setCanvasItems, applyTemplateFill, setIsFilling])

  const handleAIRecommend = async () => {
    setIsRecommending(true)
    try {
      const res  = await fetch('/api/playground/recommend', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      const picks = json.picks ?? []
      picks.forEach((pick) => {
        const entry = REGISTRY_MAP[pick.componentKey]
        if (!entry) return
        const defaults = entry.propSchema.reduce((acc, p) => {
          acc[p.key] = p.default
          return acc
        }, {})
        addItem({
          id: crypto.randomUUID(),
          componentKey: pick.componentKey,
          props: { ...defaults, ...pick.customizedProps },
          layoutHint: pick.layoutHint ?? 'full',
          sectionId: '',
          slotType: 'free',
          slotPosition: {},
          visible: true,
        })
      })
    } catch (err) {
      console.error('AI recommend error:', err)
    } finally {
      setIsRecommending(false)
    }
  }

  const handleExport = async () => {
    if (canvasItems.length === 0) return
    setIsExporting(true)
    setExportError(null)
    try {
      await exportCanvas(canvasItems, canvasSections)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const saveStatus = isDirty ? 'unsaved' : lastSaved ? 'saved' : 'idle'

  return (
    <div className="flex flex-col h-full bg-[#09090B]">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#3F3F46] bg-[#0E0E10] flex-shrink-0">
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

        {/* AI Recommend */}
        <button
          onClick={handleAIRecommend}
          disabled={isRecommending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-[#5227FF] to-[#7C3AED] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isRecommending ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          {isRecommending ? 'Generating…' : 'AI Recommend'}
        </button>

        {/* Templates */}
        <button
          onClick={() => setShowTemplatePicker(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#111113] text-[#A1A1AA] border border-[#3F3F46] hover:border-[#5227FF]/40 hover:text-[#FAFAFA] transition-all"
        >
          <BookTemplate size={13} />
          Templates
        </button>

        {/* AI filling indicator */}
        {isFilling && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#B17BFF] bg-[#5227FF]/10 border border-[#5227FF]/30">
            <Wand2 size={13} className="animate-pulse" />
            AI filling slots…
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
          disabled={isExporting || canvasItems.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#111113] text-[#A1A1AA] border border-[#3F3F46] hover:border-emerald-500/40 hover:text-emerald-400 transition-all disabled:opacity-40"
          title={canvasItems.length === 0 ? 'Add components to export' : 'Download code as ZIP'}
        >
          {isExporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          Export
        </button>
      </div>

      {/* Error banners */}
      {exportError && (
        <div className="px-4 py-2 text-xs text-red-400 bg-red-900/10 border-b border-red-900/20">
          Export error: {exportError}
        </div>
      )}
      {fillError && (
        <div className="px-4 py-2 text-xs text-amber-400 bg-amber-900/10 border-b border-amber-900/20 flex items-center justify-between">
          <span>AI fill error: {fillError} — you can swap slots manually.</span>
          <button onClick={() => setFillError(null)} className="ml-2 hover:text-white"><X size={12} /></button>
        </div>
      )}

      {/* Main 3-panel area */}
      <div className="flex flex-1 overflow-hidden">
        <AnimatePresence>{isBrowserOpen && <ComponentBrowser />}</AnimatePresence>
        <PlaygroundCanvas />
        <PropsEditor />
      </div>

      {/* Template picker modal */}
      <AnimatePresence>
        {showTemplatePicker && (
          <TemplatePicker
            isCloseable={!isFirstRun || canvasItems.length > 0}
            onClose={() => { setShowTemplatePicker(false); setIsFirstRun(false) }}
            onSelect={async (id) => { setIsFirstRun(false); await handleSelectTemplate(id) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
