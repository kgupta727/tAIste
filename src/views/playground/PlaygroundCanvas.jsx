'use client'

/**
 * PlaygroundCanvas — sections panel + full-page Sandpack preview.
 *
 * Left panel: Background component (always 1) + Hero text components + Showcase components.
 * Each row has a Swap button that opens the ComponentBrowser in the matching category.
 * Background swap updates backgroundComponent in state only (no JSX change).
 * Content component swap calls the swap API for a targeted GPT-4o-mini regeneration.
 */

import { useRef, useEffect } from 'react'
import { ArrowLeftRight, Layers, Sparkles } from 'lucide-react'
import dynamic from 'next/dynamic'
import { getSection, BACKGROUND_COMPONENTS } from '@/src/playground/componentMap'
import { usePlaygroundStore } from '@/src/stores/playgroundStore'

const PageSandpack = dynamic(
  () => import('./PageSandpack'),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-[#09090B]">
        <div className="w-5 h-5 border-2 border-[#5227FF] border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  }
)

// ── Component row ──────────────────────────────────────────────────────────────

function ComponentRow({ name }) {
  const openBrowser   = usePlaygroundStore((s) => s.openBrowser)
  const replacingComp = usePlaygroundStore((s) => s.replacingComponent)
  const isBg          = BACKGROUND_COMPONENTS.has(name)
  const isSwapping    = replacingComp === name

  return (
    <div className={`
      group flex items-center gap-2 px-3 py-2 transition-all
      border-l-2
      ${isSwapping
        ? 'bg-[#5227FF]/10 border-[#5227FF]'
        : 'border-transparent hover:bg-white/[0.02] hover:border-[#3F3F46]'}
    `}>
      <div
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: isBg ? '#5227FF' : '#06B6D4' }}
      />
      <span className="text-xs text-[#FAFAFA] flex-1 truncate leading-none">{name}</span>
      <button
        onClick={() => openBrowser(name)}
        className="p-1 rounded text-[#52525B] hover:text-[#FAFAFA] hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Swap component"
      >
        <ArrowLeftRight size={11} />
      </button>
    </div>
  )
}

// ── Section group ──────────────────────────────────────────────────────────────

function SectionGroup({ label, components }) {
  if (components.length === 0) return null
  return (
    <div className="border-b border-[#1F1F23] last:border-0">
      <div className="flex items-center gap-2 px-3 py-2 bg-[#0D0D0F]">
        <Layers size={10} className="text-[#52525B] flex-shrink-0" />
        <span className="text-[10px] font-semibold text-[#52525B] uppercase tracking-wider flex-1">
          {label}
        </span>
        <span className="text-[10px] text-[#3F3F46] tabular-nums">{components.length}</span>
      </div>
      {components.map((name) => (
        <ComponentRow key={name} name={name} />
      ))}
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center bg-[#09090B] px-6">
      <div className="w-16 h-16 rounded-2xl bg-[#111113] border border-[#3F3F46] flex items-center justify-center">
        <Sparkles size={24} className="text-[#3F3F46]" />
      </div>
      <div>
        <p className="text-[#A1A1AA] text-sm font-medium">Nothing generated yet</p>
        <p className="text-[#52525B] text-xs mt-1 leading-relaxed">
          Click <strong className="text-[#71717A]">Generate Page</strong> to create a landing page
          tailored to your brand
        </p>
      </div>
    </div>
  )
}

// ── Auto-save ──────────────────────────────────────────────────────────────────

const SAVE_DEBOUNCE_MS = 1500

function AutoSave() {
  const generatedPage = usePlaygroundStore((s) => s.generatedPage)
  const isDirty       = usePlaygroundStore((s) => s.isDirty)
  const setLastSaved  = usePlaygroundStore((s) => s.setLastSaved)
  const setIsDirty    = usePlaygroundStore((s) => s.setIsDirty)
  const saveTimer     = useRef(null)

  useEffect(() => {
    if (!isDirty || !generatedPage) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        await fetch('/api/playground', {
          method : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body   : JSON.stringify({
            items   : [{ ...generatedPage }],
            sections: [],
          }),
        })
        setLastSaved(new Date())
      } catch {
        setIsDirty(true)
      }
    }, SAVE_DEBOUNCE_MS)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [isDirty, generatedPage, setLastSaved, setIsDirty])

  return null
}

// ── Swap loading overlay ───────────────────────────────────────────────────────

function SwapOverlay() {
  const isSwapping = usePlaygroundStore((s) => s.isSwapping)
  if (!isSwapping) return null
  return (
    <div className="absolute inset-0 bg-[#09090B]/70 flex items-center justify-center z-20 backdrop-blur-sm">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#111113] border border-[#5227FF]/40 rounded-xl shadow-xl">
        <div className="w-3.5 h-3.5 border-2 border-[#5227FF] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-[#B17BFF] font-medium">Swapping component…</span>
      </div>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────

export default function PlaygroundCanvas() {
  const generatedPage = usePlaygroundStore((s) => s.generatedPage)

  const brandBg          = '#09090B'
  const brandPrimary     = '#18181B'
  const brandAccent      = '#A78BFA'
  const brandFontHeading = 'Inter'
  const brandFontBody    = 'Inter'

  const bgComponents      = generatedPage?.backgroundComponent ? [generatedPage.backgroundComponent] : []
  const heroComponents    = (generatedPage?.usedComponents ?? []).filter((n) => getSection(n) === 'hero')
  const showcaseComponents = (generatedPage?.usedComponents ?? []).filter((n) => getSection(n) === 'showcase')

  if (!generatedPage) {
    return (
      <>
        <AutoSave />
        <EmptyState />
      </>
    )
  }

  const totalCount = bgComponents.length + (generatedPage.usedComponents?.length ?? 0)

  return (
    <>
      <AutoSave />
      <div className="flex-1 flex h-full overflow-hidden relative">
        {/* ── Left: sections panel ── */}
        <div className="w-52 flex-shrink-0 flex flex-col bg-[#0A0A0C] border-r border-[#1F1F23] overflow-hidden">
          <div className="px-3 py-2.5 border-b border-[#1F1F23] flex items-center justify-between">
            <span className="text-[10px] font-semibold text-[#52525B] uppercase tracking-wider">
              Components
            </span>
            <span className="text-[10px] text-[#3F3F46] tabular-nums">{totalCount}</span>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#1F1F23]">
            <SectionGroup label="Background" components={bgComponents} />
            <SectionGroup label="Hero"        components={heroComponents} />
            <SectionGroup label="Showcase"    components={showcaseComponents} />
          </div>
        </div>

        {/* ── Right: Sandpack preview ── */}
        <SwapOverlay />
        <PageSandpack
          jsx={generatedPage.jsx}
          usedComponents={generatedPage.usedComponents}
          backgroundComponent={generatedPage.backgroundComponent}
          content={generatedPage.content}
          heroImageUrl={generatedPage.heroImageUrl}
          brandBg={brandBg}
          brandPrimary={brandPrimary}
          brandAccent={brandAccent}
          brandFontHeading={brandFontHeading}
          brandFontBody={brandFontBody}
        />
      </div>
    </>
  )
}
