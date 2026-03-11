'use client'

/**
 * GetInspired — the main view for the "Get Inspired" page.
 *
 * Layout:
 *   [ComponentBrowser?] | [PlaygroundCanvas] | [PropsEditor?]
 *
 * Top bar:
 *   ← Browse   AI Recommend   Templates   ─────────   Export   Auto-save status
 */

import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import {
  Layout,
  Sparkles,
  BookTemplate,
  Download,
  Loader2,
  CheckCircle2,
  Clock,
  PanelLeftOpen,
} from 'lucide-react'
import JSZip from 'jszip'
import { usePlaygroundStore } from '@/src/stores/playgroundStore'
import { REGISTRY_MAP } from '@/src/playground/registry'
import { TEMPLATES } from '@/src/playground/templates'
import ComponentBrowser from './playground/ComponentBrowser'
import PlaygroundCanvas from './playground/PlaygroundCanvas'
import PropsEditor from './playground/PropsEditor'

// ── Export helper ──────────────────────────────────────────────────────────────

async function exportCanvas(canvasItems) {
  const zip = new JSZip()
  const src = zip.folder('src')
  const components = src.folder('components')

  // Collect all unique component keys
  const keys = [...new Set(canvasItems.map((i) => i.componentKey))]

  // Fetch source for each component
  const fetched = {}
  await Promise.all(
    keys.map(async (key) => {
      const entry = REGISTRY_MAP[key]
      if (!entry) return
      const slug = key
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join('')
      try {
        const res = await fetch(`https://reactbits.dev/r/${slug}-TS-TW.json`)
        if (!res.ok) return
        const json = await res.json()
        // Each component file from registry
        for (const [path, { code }] of Object.entries(json.files)) {
          const filename = path.replace(/^\//, '')
          components.file(filename, code)
        }
        fetched[key] = slug
      } catch { /* skip failed fetches */ }
    })
  )

  // Build App.tsx that renders all canvas items in order
  const sortedItems = [...canvasItems].sort((a, b) => a.order - b.order)
  const imports = keys
    .map((key) => {
      const slug = fetched[key]
      if (!slug) return ''
      return `import ${slug} from './components/${slug}'`
    })
    .filter(Boolean)
    .join('\n')

  const jsxSections = sortedItems
    .map((item) => {
      const slug = fetched[item.componentKey]
      if (!slug) return ''
      const propsStr = Object.entries(item.props)
        .map(([k, v]) => {
          if (typeof v === 'string') return `${k}="${v}"`
          if (typeof v === 'boolean') return v ? k : `${k}={false}`
          return `${k}={${JSON.stringify(v)}}`
        })
        .join(' ')
      const wrapClass =
        item.layoutHint === 'half' ? 'w-1/2' : 'w-full'
      return `      <div className="${wrapClass}">\n        <${slug} ${propsStr} />\n      </div>`
    })
    .filter(Boolean)
    .join('\n')

  const appCode = `import React from 'react'
${imports}
import './index.css'

export default function App() {
  return (
    <div className="flex flex-col gap-8 min-h-screen bg-[#09090B] p-8">
      <div className="flex flex-wrap gap-4">
${jsxSections}
      </div>
    </div>
  )
}
`

  src.file('App.tsx', appCode)
  src.file(
    'index.css',
    `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n* { box-sizing: border-box; }\nbody { margin: 0; background: #09090B; }\n`
  )
  src.file(
    'main.tsx',
    `import React from 'react'\nimport { createRoot } from 'react-dom/client'\nimport './index.css'\nimport App from './App'\ncreateRoot(document.getElementById('root')!).render(<App />)\n`
  )

  zip.file(
    'package.json',
    JSON.stringify(
      {
        name: 'my-playground-export',
        version: '0.1.0',
        scripts: { dev: 'vite', build: 'vite build' },
        dependencies: {
          react: '^18',
          'react-dom': '^18',
          gsap: '^3',
          'framer-motion': '^11',
          three: '^0.160',
          '@react-three/fiber': '^8',
          '@react-three/drei': '^9',
        },
        devDependencies: {
          typescript: '^5',
          vite: '^5',
          '@vitejs/plugin-react': '^4',
          tailwindcss: '^3',
          autoprefixer: '^10',
          postcss: '^8',
        },
      },
      null,
      2
    )
  )
  zip.file(
    'vite.config.ts',
    `import { defineConfig } from 'vite'\nimport react from '@vitejs/plugin-react'\nexport default defineConfig({ plugins: [react()] })\n`
  )
  zip.file(
    'tailwind.config.js',
    `module.exports = { content: ['./src/**/*.{ts,tsx}'], theme: { extend: {} }, plugins: [] }\n`
  )
  zip.file('index.html', `<!DOCTYPE html>\n<html lang="en">\n<head><meta charset="UTF-8" /><title>Playground Export</title></head>\n<body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>\n</html>\n`)
  zip.file('README.md', `# Playground Export\n\nGenerated from tAIste Playground.\n\n## Getting Started\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n`)

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'playground-export.zip'
  a.click()
  URL.revokeObjectURL(url)
}

// ── Templates modal ────────────────────────────────────────────────────────────

function TemplatesModal({ onClose }) {
  const setCanvasItems = usePlaygroundStore((s) => s.setCanvasItems)

  const applyTemplate = (templateId) => {
    const template = TEMPLATES.find((t) => t.id === templateId)
    if (!template) return
    const items = template.items.map((item, idx) => ({ ...item, order: idx }))
    setCanvasItems(items)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-[#111113] border border-[#3F3F46] rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-[#FAFAFA]">Choose a Template</h2>
          <button onClick={onClose} className="text-[#71717A] hover:text-[#FAFAFA]">✕</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => applyTemplate(t.id)}
              className="text-left p-4 rounded-xl border border-[#3F3F46] hover:border-[#5227FF]/60 bg-[#0E0E10] hover:bg-[#111118] transition-all group"
            >
              <p className="text-sm font-semibold text-[#FAFAFA] group-hover:text-[#B17BFF] transition-colors">
                {t.name}
              </p>
              <p className="text-xs text-[#71717A] mt-1 leading-relaxed">{t.description}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {t.tags.map((tag) => (
                  <span key={tag} className="px-1.5 py-0.5 text-[10px] rounded bg-[#1A1A1F] text-[#52525B] border border-[#3F3F46]">
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── GetInspired shell ──────────────────────────────────────────────────────────

export default function GetInspired() {
  const isBrowserOpen = usePlaygroundStore((s) => s.isBrowserOpen)
  const openBrowser = usePlaygroundStore((s) => s.openBrowser)
  const isRecommending = usePlaygroundStore((s) => s.isRecommending)
  const setIsRecommending = usePlaygroundStore((s) => s.setIsRecommending)
  const isDirty = usePlaygroundStore((s) => s.isDirty)
  const lastSaved = usePlaygroundStore((s) => s.lastSaved)
  const canvasItems = usePlaygroundStore((s) => s.canvasItems)
  const addItem = usePlaygroundStore((s) => s.addItem)
  const setCanvasItems = usePlaygroundStore((s) => s.setCanvasItems)
  const [showTemplates, setShowTemplates] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState(null)

  // Load saved canvas on mount
  useEffect(() => {
    fetch('/api/playground')
      .then((r) => r.json())
      .then((json) => {
        if (Array.isArray(json.items) && json.items.length > 0) {
          setCanvasItems(json.items)
        }
      })
      .catch(() => { /* silent */ })
  }, [setCanvasItems])

  const handleAIRecommend = async () => {
    setIsRecommending(true)
    try {
      const res = await fetch('/api/playground/recommend', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')

      const picks = json.picks ?? []

      // Merge default props with AI overrides
      const currentOrder = canvasItems.length
      picks.forEach((pick, idx) => {
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
      await exportCanvas(canvasItems)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  // Save status indicator
  const saveStatus = isDirty
    ? 'unsaved'
    : lastSaved
      ? 'saved'
      : 'idle'

  return (
    <div className="flex flex-col h-full bg-[#09090B]">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#3F3F46] bg-[#0E0E10] flex-shrink-0">
        {/* Browse toggle */}
        <button
          onClick={openBrowser}
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
          {isRecommending ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Sparkles size={13} />
          )}
          {isRecommending ? 'Generating…' : 'AI Recommend'}
        </button>

        {/* Templates */}
        <button
          onClick={() => setShowTemplates(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#111113] text-[#A1A1AA] border border-[#3F3F46] hover:border-[#5227FF]/40 hover:text-[#FAFAFA] transition-all"
        >
          <BookTemplate size={13} />
          Templates
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Auto-save indicator */}
        <div className="flex items-center gap-1.5 text-xs text-[#52525B]">
          {saveStatus === 'unsaved' && <Clock size={12} className="text-amber-500" />}
          {saveStatus === 'saved' && <CheckCircle2 size={12} className="text-emerald-500" />}
          <span>
            {saveStatus === 'unsaved' && 'Saving…'}
            {saveStatus === 'saved' && `Saved ${lastSaved.toLocaleTimeString()}`}
            {saveStatus === 'idle' && 'No changes'}
          </span>
        </div>

        {/* Export */}
        <button
          onClick={handleExport}
          disabled={isExporting || canvasItems.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#111113] text-[#A1A1AA] border border-[#3F3F46] hover:border-emerald-500/40 hover:text-emerald-400 transition-all disabled:opacity-40"
          title={canvasItems.length === 0 ? 'Add components to export' : 'Download code as ZIP'}
        >
          {isExporting ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Download size={13} />
          )}
          Export
        </button>
      </div>

      {exportError && (
        <div className="px-4 py-2 text-xs text-red-400 bg-red-900/10 border-b border-red-900/20">
          Export error: {exportError}
        </div>
      )}

      {/* Main 3-panel area */}
      <div className="flex flex-1 overflow-hidden">
        <AnimatePresence>{isBrowserOpen && <ComponentBrowser />}</AnimatePresence>
        <PlaygroundCanvas />
        <PropsEditor />
      </div>

      {/* Templates modal */}
      <AnimatePresence>
        {showTemplates && <TemplatesModal onClose={() => setShowTemplates(false)} />}
      </AnimatePresence>
    </div>
  )
}
