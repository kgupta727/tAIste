'use client'

/**
 * PageSandpack — renders the canvas in a single Sandpack iframe.
 *
 * Two rendering modes:
 *  - Slot mode:  when `sections` is provided and non-empty, generates a
 *    section-based App.tsx where each section is a 100vh block and each item
 *    is absolutely positioned within it according to `item.slotPosition`.
 *    Background items fill the section (z:0), content items float above (z:1).
 *  - Flat mode:  fallback for manually assembled canvases with no sections —
 *    renders items stacked in a flex column.
 *
 * The generated page uses Brand DNA values (colors, fonts) stored on each
 * CanvasSection as CSS custom properties and Google Fonts imports.
 *
 * Rebuilds are debounced (800 ms) so rapid prop changes don't thrash Sandpack.
 */

import { useEffect, useRef, useState } from 'react'
import {
  SandpackProvider,
  SandpackPreview as SbPreview,
} from '@codesandbox/sandpack-react'
import type { SandpackFiles } from '@codesandbox/sandpack-react'
import type { CanvasItem, CanvasSection, SlotPosition } from '@/src/stores/playgroundStore'
import { REGISTRY_MAP } from '@/src/playground/registry'

// ── Types ─────────────────────────────────────────────────────────────────────

type RegistryFile = { path: string; content: string }
type RegistryJson  = { files: RegistryFile[] }

// ── Module-level cache ────────────────────────────────────────────────────────

const sourceCache = new Map<string, RegistryJson>()

// ── Pinned versions for known packages (everything else gets 'latest') ────────

const PINNED_VERSIONS: Record<string, string> = {
  'framer-motion'                    : '^11',
  'motion'                           : '^11',
  '@gsap/react'                      : '^2',
  'gsap'                             : '^3',
  'three'                            : '^0.160',
  '@react-three/fiber'               : '^8',
  '@react-three/drei'                : '^9',
  '@react-three/postprocessing'      : '^2',
  'postprocessing'                   : '^6',
  'ogl'                              : '^1',
  'matter-js'                        : '^0.19',
  'leva'                             : '^0.9',
  'react-router-dom'                 : '^6',
  'react-spring'                     : '^9',
  '@react-spring/web'                : '^9',
  '@react-spring/three'              : '^9',
  'clsx'                             : '^2',
  'tailwind-merge'                   : '^2',
  'class-variance-authority'         : '^0.7',
  'lucide-react'                     : '^0.400',
  'simplex-noise'                    : '^4',
  'maath'                            : '^0.10',
  'troika-three-text'                : '^0.47',
  'cannon-es'                        : '^0.20',
  'react-intersection-observer'      : '^9',
  'd3'                               : '^7',
  'p5'                               : '^1',
  'tone'                             : '^14',
  'zustand'                          : '^4',
  'jotai'                            : '^2',
  'react-use'                        : '^17',
  'react-icons'                      : '^5',
  'sonner'                           : '^1',
  '@tanstack/react-query'            : '^5',
}

// ── Dynamically extract all third-party package names from source ────────────

function extractDeps(allSource: string): Record<string, string> {
  const deps: Record<string, string> = {}
  const seen = new Set<string>()
  const re = /(?:from|import)\s+['"]([^./'"][^'"]*)['"]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(allSource)) !== null) {
    const raw = m[1]
    let pkg = raw.startsWith('@')
      ? raw.split('/').slice(0, 2).join('/')
      : raw.split('/')[0]
    if (!pkg || pkg === 'react' || pkg === 'react-dom') continue
    if (seen.has(pkg)) continue
    seen.add(pkg)
    deps[pkg] = PINNED_VERSIONS[pkg] ?? 'latest'
  }
  return deps
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toPascalCase(key: string) {
  return key.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('')
}

async function fetchRegistry(key: string): Promise<RegistryJson | null> {
  if (sourceCache.has(key)) return sourceCache.get(key)!
  const slug = toPascalCase(key)
  try {
    const res = await fetch(`/api/reactbits?slug=${slug}-TS-TW.json`)
    if (!res.ok) return null
    const json: RegistryJson = await res.json()
    sourceCache.set(key, json)
    return json
  } catch {
    return null
  }
}

function serializeProps(props: Record<string, unknown>): string {
  return Object.entries(props)
    .map(([k, v]) => {
      if (typeof v === 'string') return `${k}="${v}"`
      if (typeof v === 'boolean') return v ? k : `${k}={false}`
      if (typeof v === 'number') return `${k}={${v}}`
      return `${k}={${JSON.stringify(v)}}`
    })
    .join('\n            ')
}

function slotPosToStyle(pos: SlotPosition, zIndex: number): string {
  const parts: string[] = [`position: 'absolute'`, `zIndex: ${zIndex}`]
  if (pos.top       !== undefined) parts.push(`top: '${pos.top}'`)
  if (pos.bottom    !== undefined) parts.push(`bottom: '${pos.bottom}'`)
  if (pos.left      !== undefined) parts.push(`left: '${pos.left}'`)
  if (pos.right     !== undefined) parts.push(`right: '${pos.right}'`)
  if (pos.width     !== undefined) parts.push(`width: '${pos.width}'`)
  if (pos.transform !== undefined) parts.push(`transform: '${pos.transform}'`)
  if (pos.textAlign !== undefined) parts.push(`textAlign: '${pos.textAlign}'`)
  return `{ ${parts.join(', ')} }`
}

const DEFAULT_LOGO_ITEMS: Record<string, unknown>[] = [
  { node: 'Acme' },
  { node: 'Vertex' },
  { node: 'Nimbus' },
  { node: 'Orbit' },
  { node: 'Pulse' },
  { node: 'Flux' },
]

function normalizeLogoItems(logos: unknown): Record<string, unknown>[] {
  const toNodeItem = (label: string): Record<string, unknown> => ({ node: label })

  if (Array.isArray(logos)) {
    const normalized = logos
      .map((item) => {
        if (typeof item === 'string') {
          const value = item.trim()
          return value ? toNodeItem(value) : null
        }
        if (!item || typeof item !== 'object') return null

        const obj = item as Record<string, unknown>
        if (typeof obj.node === 'string' && obj.node.trim()) {
          return { ...obj, node: obj.node.trim() }
        }
        if (typeof obj.src === 'string' && obj.src.trim()) {
          const trimmedSrc = obj.src.trim()
          const alt = typeof obj.alt === 'string' && obj.alt.trim() ? obj.alt.trim() : 'Logo'
          return { ...obj, src: trimmedSrc, alt }
        }
        if (typeof obj.name === 'string' && obj.name.trim()) {
          return toNodeItem(obj.name.trim())
        }
        if (typeof obj.title === 'string' && obj.title.trim()) {
          return toNodeItem(obj.title.trim())
        }
        return null
      })
      .filter((item): item is Record<string, unknown> => item !== null)

    return normalized.length > 0 ? normalized : DEFAULT_LOGO_ITEMS
  }

  if (typeof logos === 'string' && logos.trim()) {
    const parsed = logos
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map(toNodeItem)
    return parsed.length > 0 ? parsed : DEFAULT_LOGO_ITEMS
  }

  return DEFAULT_LOGO_ITEMS
}

// ── Background luminance + adaptive theme helpers ─────────────────────────────

function bgLuminance(hex: string): number {
  const c = hex.replace('#', '').padEnd(6, '0')
  const toLinear = (v: number) => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  const r = toLinear(parseInt(c.slice(0, 2), 16) / 255)
  const g = toLinear(parseInt(c.slice(2, 4), 16) / 255)
  const b = toLinear(parseInt(c.slice(4, 6), 16) / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function getTheme(brandBg: string) {
  const isLight = bgLuminance(brandBg) > 0.35
  return {
    textHigh    : isLight ? '#09090B'              : 'rgba(255,255,255,1)',
    textMid     : isLight ? 'rgba(0,0,0,0.65)'     : 'rgba(255,255,255,0.9)',
    textLow     : isLight ? 'rgba(0,0,0,0.4)'      : 'rgba(255,255,255,0.5)',
    textSubtle  : isLight ? 'rgba(0,0,0,0.3)'      : 'rgba(255,255,255,0.3)',
    navBg       : isLight ? 'rgba(255,255,255,0.75)': 'rgba(0,0,0,0.25)',
    navBorder   : isLight ? 'rgba(0,0,0,0.08)'     : 'rgba(255,255,255,0.06)',
    btnSecBg    : isLight ? 'rgba(0,0,0,0.06)'     : 'rgba(255,255,255,0.06)',
    btnSecColor : isLight ? 'rgba(0,0,0,0.75)'     : 'rgba(255,255,255,0.85)',
    btnSecBorder: isLight ? 'rgba(0,0,0,0.15)'     : 'rgba(255,255,255,0.18)',
    navSecColor : isLight ? 'rgba(0,0,0,0.5)'      : 'rgba(255,255,255,0.65)',
  }
}

// ── Text animation component keys that need a mount guard ───────────────────
const TEXT_ANIM_KEYS = new Set([
  'blur-text', 'split-text', 'shiny-text', 'gradient-text', 'rotating-text',
  'decrypted-text', 'scroll-reveal', 'scrambled-text', 'text-type', 'curved-loop',
  'fade-content', 'count-up', 'counter',
])

// ── Brand CSS + Google Fonts injector ─────────────────────────────────────────
// Produces the full index.css content with :root variables and font imports

function buildBrandCSS(sections: CanvasSection[]): string {
  // Extract brand values from the first section that has them
  const src = sections.find((s) => s.brandAccent || s.brandPrimary) ?? sections[0]

  const brandBg         = src?.brandBg          ?? '#09090B'
  const brandPrimary    = src?.brandPrimary      ?? '#18181B'
  const brandAccent     = src?.brandAccent       ?? '#A78BFA'
  const brandFontHead   = src?.brandFontHeading  ?? 'Inter'
  const brandFontBody   = src?.brandFontBody     ?? 'Inter'

  // Build Google Fonts URL — deduplicate if heading = body
  const fonts: string[] = []
  const headSlug = brandFontHead.replace(/\s+/g, '+')
  const bodySlug = brandFontBody.replace(/\s+/g, '+')
  fonts.push(`family=${headSlug}:wght@300;400;600;700;800;900`)
  if (brandFontBody !== brandFontHead) {
    fonts.push(`family=${bodySlug}:wght@300;400;500;600`)
  }
  const fontUrl = `https://fonts.googleapis.com/css2?${fonts.join('&')}&display=swap`

  return `@import url('${fontUrl}');
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --brand-bg: ${brandBg};
  --brand-primary: ${brandPrimary};
  --brand-accent: ${brandAccent};
  --brand-accent-glow: ${brandAccent}55;
  --brand-font-heading: '${brandFontHead}', system-ui, sans-serif;
  --brand-font-body: '${brandFontBody}', system-ui, sans-serif;
}

*  { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  background: var(--brand-bg);
  font-family: var(--brand-font-body);
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}
h1, h2, h3, h4 { font-family: var(--brand-font-heading); }
`
}

// ── Slot-mode App.tsx builder ─────────────────────────────────────────────────

function buildSlotApp(
  items: CanvasItem[],
  sections: CanvasSection[],
  registries: Record<string, RegistryJson>,
): { files: SandpackFiles; deps: Record<string, string> } {
  const files: SandpackFiles = {}
  const seenPaths  = new Set<string>()
  let   allSource  = ''
  const deps: Record<string, string> = {}
  const imports: string[] = []
  const seenComponents = new Set<string>()

  const visibleItems = items
    .filter((i) => i.visible !== false && i.componentKey && registries[i.componentKey])
    .map((i) => {
      if (i.componentKey !== 'logo-loop') return i
      return { ...i, props: { ...i.props, logos: normalizeLogoItems(i.props?.logos) } }
    })

  for (const item of visibleItems) {
    const json = registries[item.componentKey]
    if (!json) continue
    for (const file of json.files) {
      const path = file.path.startsWith('/') ? file.path : `/${file.path}`
      if (!seenPaths.has(path)) {
        files[path] = { code: file.content }
        allSource  += file.content
        seenPaths.add(path)
      }
    }
    if (!seenComponents.has(item.componentKey)) {
      seenComponents.add(item.componentKey)
      const componentName = toPascalCase(item.componentKey)
      let mainFilePath = `/${componentName}/${componentName}.tsx`
      for (const file of json.files) {
        const p = file.path.startsWith('/') ? file.path : `/${file.path}`
        if ((p.split('/').pop() ?? '').toLowerCase() === `${componentName.toLowerCase()}.tsx`) {
          mainFilePath = p
          break
        }
      }
      imports.push(`import ${componentName} from './${mainFilePath.replace(/^\//, '').replace(/\.tsx?$/, '')}'`)
    }
  }

  Object.assign(deps, extractDeps(allSource))

  const bySection = new Map<string, CanvasItem[]>()
  for (const item of visibleItems) {
    const arr = bySection.get(item.sectionId) ?? []
    arr.push(item)
    bySection.set(item.sectionId, arr)
  }

  // ── Extract brand values from first section ────────────────────────────────
  const firstSec   = sections[0]
  const brandAccent = firstSec?.brandAccent     ?? '#A78BFA'
  const brandFontH  = firstSec?.brandFontHeading ?? 'Inter'
  const brandBg     = firstSec?.brandBg         ?? '#09090B'

  // ── Single fixed background — spans the full page ─────────────────────────
  const bgItem = visibleItems.find((i) => i.slotType === 'background')
  // If a dark background component is present (aurora, beams, etc.), the visual
  // background is always dark regardless of brandBg — force light text.
  const theme       = bgItem ? getTheme('#09090B') : getTheme(brandBg)
  const fixedBgJsx = bgItem ? [
    `      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', zIndex: 0, pointerEvents: 'none' }}>`,
    `        <${toPascalCase(bgItem.componentKey)}`,
    `          ${serializeProps(bgItem.props)}`,
    `        />`,
    `      </div>`,
  ].join('\n') : ''

  const sortedSections = [...sections].sort((a, b) => a.order - b.order)
  const sectionJsx: string[] = []

  for (const section of sortedSections) {
    const allSectionItems = bySection.get(section.id) ?? []
    const sectionItems = allSectionItems.filter((i) => i.slotType !== 'background')
    if (sectionItems.length === 0) continue

    const navItem      = sectionItems.find((i) => i.slotType === 'nav')
    const headlineItem = sectionItems.find((i) => i.slotType === 'hero-headline')
    const subItem      = sectionItems.find((i) => i.slotType === 'hero-sub')
    const logoItem     = sectionItems.find((i) => i.slotType === 'logo-strip')
    const accentItem   = sectionItems.find((i) => i.slotType === 'hero-accent')
    const contentItems = sectionItems.filter((i) =>
      ['card-grid', 'gallery', 'feature-text', 'counter-row', 'cta', 'free'].includes(i.slotType)
    )
    const isHero = !!(headlineItem ?? subItem)

    // Per-section brand values (fall back to first-section values)
    const secAccent   = section.brandAccent     ?? brandAccent
    const secFontH    = section.brandFontHeading ?? brandFontH
    const brandName   = section.brandName   ?? 'Your Brand'
    const subtitle    = section.subtitle    ?? ''
    const ctaPrimary  = section.ctaPrimary  ?? 'Get Started'
    const ctaSecondary = section.ctaSecondary ?? 'See how it works'

    if (isHero) {
      // ── Nav bar ──────────────────────────────────────────────────────────
      const navLayer = navItem ? [
        `        <div className="absolute top-0 left-0 right-0 z-20">`,
        `          <${toPascalCase(navItem.componentKey)}`,
        `            ${serializeProps(navItem.props)}`,
        `          />`,
        `        </div>`,
      ].join('\n') : [
        `        <nav style={{ position:'absolute', top:0, left:0, right:0, zIndex:20, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'1.25rem 2.5rem', background:'${theme.navBg}', backdropFilter:'blur(12px)', borderBottom:'1px solid ${theme.navBorder}' }}>`,
        `          <span style={{ fontFamily:'var(--brand-font-heading)', fontWeight:800, fontSize:'1.125rem', color:'${theme.textHigh}', letterSpacing:'-0.02em' }}>${brandName}</span>`,
        `          <div style={{ display:'flex', gap:'0.75rem', alignItems:'center' }}>`,
        `            <button style={{ background:'transparent', color:'${theme.navSecColor}', fontSize:'0.875rem', border:'none', cursor:'pointer', padding:'0.5rem 1rem' }}>${ctaSecondary}</button>`,
        `            <button style={{ background:'${secAccent}', color:'white', fontSize:'0.875rem', fontWeight:600, border:'none', cursor:'pointer', padding:'0.625rem 1.25rem', borderRadius:'9999px', boxShadow:'0 0 20px ${secAccent}44' }}>${ctaPrimary}</button>`,
        `          </div>`,
        `        </nav>`,
      ].join('\n')

      // ── Headline ReactBits accent ────────────────────────────────────────
      const headlineFallback = brandName
      const headlineJsx = headlineItem ? [
        `            {mounted ? (`,
        `              <${toPascalCase(headlineItem.componentKey)}`,
        `                className="text-6xl font-black leading-none"`,
        `                style={{ color:'${theme.textHigh}' }}`,
        `                ${serializeProps(headlineItem.props)}`,
        `              />`,
        `            ) : (`,
        `              <span style={{ fontSize: '3.75rem', fontWeight: 900, color: '${theme.textHigh}', opacity: 0 }}>${headlineFallback}</span>`,
        `            )}`,
      ].join('\n') : ''

      // ── Sub text ReactBits accent ────────────────────────────────────────
      const subFallback = subtitle || brandName
      const subJsx = subItem ? [
        `            <div style={{ fontSize:'1.5rem', color:'${theme.textMid}' }}>`,
        `              {mounted ? (`,
        `                <${toPascalCase(subItem.componentKey)}`,
        `                  className="text-2xl font-medium"`,
        `                  style={{ color:'${theme.textMid}' }}`,
        `                  ${serializeProps(subItem.props)}`,
        `                />`,
        `              ) : (`,
        `                <span style={{ fontSize:'1.5rem', color:'${theme.textMid}', opacity:0 }}>${subFallback}</span>`,
        `              )}`,
        `            </div>`,
      ].join('\n') : ''

      // ── Counter row (stays inside hero) ─────────────────────────────────
      const counterItems = contentItems.filter((i) => i.slotType === 'counter-row')
      const counterJsx = counterItems.length > 0 ? [
        `            <div style={{ width:'100%', maxWidth:'48rem', marginTop:'1rem' }}>`,
        ...counterItems.map((i) => [
          `              <${toPascalCase(i.componentKey)}`,
          `                ${serializeProps(i.props)}`,
          `              />`,
        ].join('\n')),
        `            </div>`,
      ].join('\n') : ''

      // ── Logo strip anchored to bottom ────────────────────────────────────
      const logoJsx = logoItem ? [
        `        <div style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:10, paddingBottom:'0.5rem' }}>`,
        `          <${toPascalCase(logoItem.componentKey)}`,
        `            ${serializeProps(logoItem.props)}`,
        `          />`,
        `        </div>`,
      ].join('\n') : ''

      // ── Hero accent — inline below CTA buttons ───────────────────────────
      const accentJsx = accentItem ? (() => {
        const accentCn = toPascalCase(accentItem.componentKey)
        const accentPs = serializeProps(accentItem.props)
        const inner = TEXT_ANIM_KEYS.has(accentItem.componentKey)
          ? `{mounted ? <${accentCn} ${accentPs} /> : <span style={{opacity:0}}>...</span>}`
          : `<${accentCn} ${accentPs} />`
        return [
          `            <div style={{ width:'100%', display:'flex', justifyContent:'center', marginTop:'0.75rem' }}>`,
          `              ${inner}`,
          `            </div>`,
        ].join('\n')
      })() : ''

      sectionJsx.push([
        `        <section style={{ position:'relative', display:'flex', flexDirection:'column', height:'${section.heightVh}vh', background:'transparent', margin:0, border:'none', overflow:'hidden' }}>`,
        navLayer,
        logoJsx,
        `          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, textAlign:'center', maxWidth:'58rem', margin:'0 auto', padding:'0 2.5rem', gap:'1.75rem' }}>`,
        headlineJsx,
        subJsx,
        subtitle ? `            <p style={{ fontSize:'1.2rem', color:'${theme.textLow}', lineHeight:1.65, maxWidth:'44rem', fontFamily:'var(--brand-font-body)' }}>${subtitle}</p>` : '',
        `            <div style={{ display:'flex', flexWrap:'wrap', gap:'0.875rem', justifyContent:'center', paddingTop:'0.25rem' }}>`,
        `              <button style={{ background:'${secAccent}', color:'white', padding:'0.875rem 2.25rem', borderRadius:'9999px', fontWeight:700, fontSize:'0.9rem', border:'none', cursor:'pointer', boxShadow:'0 0 28px ${secAccent}50', fontFamily:'var(--brand-font-body)', letterSpacing:'0.01em' }}>${ctaPrimary}</button>`,
        `              <button style={{ background:'${theme.btnSecBg}', color:'${theme.btnSecColor}', padding:'0.875rem 2.25rem', borderRadius:'9999px', fontSize:'0.9rem', border:'1px solid ${theme.btnSecBorder}', cursor:'pointer', fontFamily:'var(--brand-font-body)', backdropFilter:'blur(4px)' }}>${ctaSecondary}</button>`,
        `            </div>`,
        accentJsx,
        counterJsx,
        `          </div>`,
        `        </section>`,
      ].filter(Boolean).join('\n'))

    } else {
      // ── Content section ────────────────────────────────────────────────────
      const isCounterSection = contentItems.some((i) => i.slotType === 'counter-row')
      const isCtaSection     = contentItems.some((i) => i.slotType === 'feature-text' || i.slotType === 'cta')

      // Section heading row — shown above every non-hero section
      const sectionHeading = [
        `            <div style={{ textAlign:'center', paddingBottom:'1rem' }}>`,
        `              <p style={{ fontSize:'0.65rem', letterSpacing:'0.3em', textTransform:'uppercase', color:'${theme.textSubtle}', fontFamily:'var(--brand-font-body)', marginBottom:'0.75rem' }}>${section.label.toUpperCase()}</p>`,
        `              <h2 style={{ fontSize:'clamp(2rem, 5vw, 3rem)', fontWeight:800, color:'${theme.textHigh}', fontFamily:'var(--brand-font-heading)', lineHeight:1.1, letterSpacing:'-0.02em' }}>${brandName}</h2>`,
        subtitle ? `              <p style={{ fontSize:'1.05rem', color:'${theme.textLow}', maxWidth:'36rem', margin:'0.875rem auto 0', lineHeight:1.65, fontFamily:'var(--brand-font-body)' }}>${subtitle}</p>` : '',
        `            </div>`,
      ].filter(Boolean).join('\n')

      let innerContent = ''

      if (isCounterSection) {
        const statJsx = contentItems
          .filter((i) => i.slotType === 'counter-row')
          .map((i) => {
            const cn = toPascalCase(i.componentKey)
            const ps = serializeProps(i.props)
            const numJsx = TEXT_ANIM_KEYS.has(i.componentKey)
              ? `{mounted ? <${cn} ${ps} /> : <span style={{opacity:0}}>—</span>}`
              : `<${cn} ${ps} />`
            return [
              `              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'0.5rem', padding:'0 2rem' }}>`,
              `                <div style={{ fontSize:'4rem', fontWeight:900, color:'${theme.textHigh}', lineHeight:1, fontFamily:'var(--brand-font-heading)' }}>${numJsx}</div>`,
              `                <div style={{ fontSize:'0.7rem', color:'${theme.textSubtle}', textTransform:'uppercase', letterSpacing:'0.25em', fontFamily:'var(--brand-font-body)' }}>${section.label}</div>`,
              `              </div>`,
            ].join('\n')
          }).join('\n')

        innerContent = [
          `            <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', gap:'3rem', width:'100%', maxWidth:'56rem', margin:'0 auto', padding:'2rem 0' }}>`,
          statJsx,
          `            </div>`,
        ].join('\n')

      } else if (isCtaSection) {
        const ctaCompJsx = contentItems
          .filter((i) => i.slotType === 'feature-text' || i.slotType === 'cta')
          .map((i) => {
            const cn = toPascalCase(i.componentKey)
            const ps = serializeProps(i.props)
            if (TEXT_ANIM_KEYS.has(i.componentKey)) {
              return `{mounted ? <${cn} ${ps} /> : <span style={{opacity:0}}>...</span>}`
            }
            return `<${cn} ${ps} />`
          }).join('\n              ')

        innerContent = [
          `            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'2rem', width:'100%', maxWidth:'48rem', margin:'0 auto', textAlign:'center', padding:'1rem 0' }}>`,
          `              <div style={{ fontSize:'clamp(2rem, 4vw, 3.25rem)', fontWeight:900, color:'white', lineHeight:1.1, fontFamily:'var(--brand-font-heading)' }}>`,
          `                ${ctaCompJsx}`,
          `              </div>`,
          subtitle ? `              <p style={{ fontSize:'1.1rem', color:'${theme.textLow}', maxWidth:'36rem', fontFamily:'var(--brand-font-body)', lineHeight:1.65 }}>${subtitle}</p>` : '',
          `              <div style={{ display:'flex', gap:'0.875rem', flexWrap:'wrap', justifyContent:'center' }}>`,
          `                <button style={{ background:'${secAccent}', color:'white', padding:'0.875rem 2.5rem', borderRadius:'9999px', fontWeight:700, fontSize:'0.9rem', border:'none', cursor:'pointer', boxShadow:'0 0 28px ${secAccent}50', fontFamily:'var(--brand-font-body)' }}>${ctaPrimary}</button>`,
          `                <button style={{ background:'${theme.btnSecBg}', color:'${theme.btnSecColor}', padding:'0.875rem 2.5rem', borderRadius:'9999px', fontSize:'0.9rem', border:'1px solid ${theme.btnSecBorder}', cursor:'pointer', fontFamily:'var(--brand-font-body)', backdropFilter:'blur(4px)' }}>${ctaSecondary}</button>`,
          `              </div>`,
          `            </div>`,
        ].filter(Boolean).join('\n')

      } else {
        // Card grid / gallery / free
        innerContent = contentItems.map((i) => {
          const cn = toPascalCase(i.componentKey)
          const ps = serializeProps(i.props)
          if (TEXT_ANIM_KEYS.has(i.componentKey)) {
            return [
              `            <div style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', minHeight:'10rem' }}>`,
              `              {mounted ? <${cn} ${ps} /> : null}`,
              `            </div>`,
            ].join('\n')
          }
          return [
            `            <div style={{ width:'100%', minHeight:'30rem', overflow:'hidden', borderRadius:'1rem' }}>`,
            `              <${cn}`,
            `                ${ps}`,
            `              />`,
            `            </div>`,
          ].join('\n')
        }).join('\n')
      }

      sectionJsx.push([
        `        <section style={{ position:'relative', display:'flex', flexDirection:'column', minHeight:'${section.heightVh}vh', background:'transparent', margin:0, border:'none' }}>`,
        `          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, padding:'5rem 2.5rem 4rem', gap:'2.5rem', width:'100%' }}>`,
        sectionHeading,
        innerContent,
        `            <button style={{ background:'${secAccent}', color:'white', padding:'0.75rem 2rem', borderRadius:'9999px', fontWeight:600, fontSize:'0.875rem', border:'none', cursor:'pointer', boxShadow:'0 0 20px ${secAccent}44', fontFamily:'var(--brand-font-body)', marginTop:'0.5rem', flexShrink:0 }}>${ctaPrimary}</button>`,
        `          </div>`,
        `        </section>`,
      ].filter(Boolean).join('\n'))
    }
  }

  // Orphan items (no matching section) — skip background orphans
  const orphans = visibleItems.filter(
    (i) => i.slotType !== 'background' && !sections.find((s) => s.id === i.sectionId)
  )
  const orphanJsx = orphans.map((item) => {
    const cn = toPascalCase(item.componentKey)
    const ps = serializeProps(item.props)
    return `        <div style={{ width:'100%', minHeight:'500px', position:'relative', overflow:'hidden', borderRadius:'1rem' }}>\n          <${cn}\n            ${ps}\n          />\n        </div>`
  })

  const appCode = `import React from 'react'
${imports.join('\n')}

export default function App() {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => { setMounted(true) }, [])

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--brand-bg)' }}>
${fixedBgJsx}
      <div style={{ position: 'relative', zIndex: 1 }}>
${sectionJsx.join('\n')}
${orphanJsx.length > 0 ? `        <div style={{ display:'flex', flexDirection:'column', width:'100%', gap:'2rem', padding:'2rem' }}>\n${orphanJsx.join('\n')}\n        </div>` : ''}
      </div>
    </div>
  )
}
`

  files['/App.tsx']   = { code: appCode }
  files['/index.tsx'] = { code: `import React from 'react'\nimport { createRoot } from 'react-dom/client'\nimport './index.css'\nimport App from './App'\ncreateRoot(document.getElementById('root')!).render(<App />)\n` }
  files['/index.css'] = { code: buildBrandCSS(sections) }
  return { files, deps }
}

// ── Flat-mode builder (no sections) ──────────────────────────────────────────

function buildFlatApp(
  items: CanvasItem[],
  registries: Record<string, RegistryJson>,
): { files: SandpackFiles; deps: Record<string, string> } {
  const files: SandpackFiles = {}
  const seenPaths  = new Set<string>()
  let   allSource  = ''
  const deps: Record<string, string> = {}

  for (const json of Object.values(registries)) {
    for (const file of json.files) {
      const path = file.path.startsWith('/') ? file.path : `/${file.path}`
      if (!seenPaths.has(path)) {
        files[path] = { code: file.content }
        allSource  += file.content
        seenPaths.add(path)
      }
    }
  }

  Object.assign(deps, extractDeps(allSource))

  const sorted = [...items]
    .filter((i) => i.visible !== false)
    .map((i) => {
      if (i.componentKey !== 'logo-loop') return i
      return { ...i, props: { ...i.props, logos: normalizeLogoItems(i.props?.logos) } }
    })
    .sort((a, b) => a.order - b.order)

  const imports: string[] = []
  const jsxRows: string[] = []
  let   halfBuffer = ''
  const flushHalves = () => {
    if (!halfBuffer) return
    jsxRows.push(`      <div style={{ display:'flex', flexWrap:'wrap', width:'100%' }}>\n${halfBuffer}      </div>`)
    halfBuffer = ''
  }

  for (const item of sorted) {
    const json = registries[item.componentKey]
    if (!json) continue
    const cn = toPascalCase(item.componentKey)
    let mainFilePath = `/${cn}/${cn}.tsx`
    for (const file of json.files) {
      const p = file.path.startsWith('/') ? file.path : `/${file.path}`
      if ((p.split('/').pop() ?? '').toLowerCase() === `${cn.toLowerCase()}.tsx`) { mainFilePath = p; break }
    }
    const varName = `${cn}_${item.id.slice(0, 8).replace(/-/g, '')}`
    imports.push(`import ${varName} from './${mainFilePath.replace(/^\//, '').replace(/\.tsx?$/, '')}'`)
    const ps = serializeProps(item.props)
    if (item.layoutHint === 'half') {
      halfBuffer += `        <div style={{ width:'50%', minHeight:'400px', position:'relative', overflow:'hidden' }}>\n          <${varName}\n            ${ps}\n          />\n        </div>\n`
    } else {
      flushHalves()
      jsxRows.push(`      <div style={{ width:'100%', minHeight:'500px', position:'relative', overflow:'hidden', borderRadius:'1rem' }}>\n        <${varName}\n          ${ps}\n        />\n      </div>`)
    }
  }
  flushHalves()

  const appCode = `import React from 'react'
${imports.join('\n')}

export default function App() {
  return (
    <div style={{ display:'flex', flexDirection:'column', width:'100%', minHeight:'100vh', background:'var(--brand-bg)', gap:'2rem', padding:'2rem' }}>
${jsxRows.join('\n')}
    </div>
  )
}
`
  files['/App.tsx']   = { code: appCode }
  files['/index.tsx'] = { code: `import React from 'react'\nimport { createRoot } from 'react-dom/client'\nimport './index.css'\nimport App from './App'\ncreateRoot(document.getElementById('root')!).render(<App />)\n` }
  files['/index.css'] = { code: `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n:root {\n  --brand-bg: #09090B;\n  --brand-accent: #A78BFA;\n  --brand-font-heading: 'Inter', system-ui, sans-serif;\n  --brand-font-body: 'Inter', system-ui, sans-serif;\n}\n\n* { box-sizing: border-box; margin: 0; padding: 0; }\nbody { background: var(--brand-bg); font-family: var(--brand-font-body); -webkit-font-smoothing: antialiased; }\nh1, h2, h3 { font-family: var(--brand-font-heading); }\n` }
  return { files, deps }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface PageSandpackProps {
  items: CanvasItem[]
  sections?: CanvasSection[]
}

export default function PageSandpack({ items, sections = [] }: PageSandpackProps) {
  const [sandpack, setSandpack] = useState<{
    files: SandpackFiles
    deps: Record<string, string>
    key: string
  } | null>(null)
  const [loading, setLoading]   = useState(false)
  const buildCountRef = useRef(0)
  const debounceRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  const visibleItems = items.filter((i) => i.visible !== false && i.componentKey)
  const hasEmptySections = sections.length > 0 && visibleItems.length === 0

  useEffect(() => {
    if (visibleItems.length === 0) {
      setSandpack(null)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const uniqueKeys = [...new Set(visibleItems.map((i) => i.componentKey))]
      const results    = await Promise.all(uniqueKeys.map(async (key) => ({ key, json: await fetchRegistry(key) })))
      const registries: Record<string, RegistryJson> = {}
      for (const { key, json } of results) if (json) registries[key] = json

      const built = sections.length > 0
        ? buildSlotApp(visibleItems, sections, registries)
        : buildFlatApp(visibleItems, registries)

      buildCountRef.current += 1
      setSandpack({ ...built, key: String(buildCountRef.current) })
      setLoading(false)
    }, 800)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [items, sections]) // eslint-disable-line react-hooks/exhaustive-deps

  if (hasEmptySections) {
    // Wireframe skeleton while AI fills slots
    const sortedSections = [...sections].sort((a, b) => a.order - b.order)
    const accentColor = sections[0]?.brandAccent ?? '#A78BFA'
    return (
      <div className="relative flex-1 overflow-y-auto bg-[#09090B]">
        <div className="flex flex-col gap-0">
          {sortedSections.map((sec) => {
            const secItems = items.filter((i) => i.sectionId === sec.id)
            return (
              <div
                key={sec.id}
                style={{ minHeight: `${sec.heightVh}vh` }}
                className="relative border-b border-[#3F3F46]/30 flex flex-col"
              >
                <div className="absolute top-3 left-4 text-[10px] text-[#52525B] font-mono tracking-widest uppercase">
                  {sec.label}
                </div>
                <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 pt-10">
                  {secItems.map((item) => (
                    <div
                      key={item.id}
                      className="w-3/4 h-12 rounded-lg border border-dashed flex items-center justify-center"
                      style={{ borderColor: `${accentColor}40` }}
                    >
                      <span className="text-[11px] font-mono" style={{ color: `${accentColor}80` }}>{item.slotType}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (visibleItems.length === 0) return null

  if (!sandpack) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-[#09090B]">
        <div className="w-5 h-5 border-2 border-[#5227FF] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-[#52525B]">Building preview…</p>
      </div>
    )
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      {loading && (
        <div className="absolute inset-0 bg-[#09090B]/60 flex items-center justify-center z-10 backdrop-blur-sm">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#111113] border border-[#3F3F46] rounded-lg">
            <div className="w-3 h-3 border border-[#5227FF] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-[#A1A1AA]">Updating…</span>
          </div>
        </div>
      )}

      <div className="absolute inset-0 flex flex-col">
        <SandpackProvider
          key={sandpack.key}
          files={sandpack.files}
          template="react-ts"
          theme="dark"
          style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }}
          options={{ externalResources: ['https://cdn.tailwindcss.com'] }}
          customSetup={{
            dependencies: { react: '^18', 'react-dom': '^18', ...sandpack.deps },
          }}
        >
          <SbPreview
            style={{ flex: 1, height: '100%' }}
            showOpenInCodeSandbox={false}
            showRefreshButton={false}
          />
        </SandpackProvider>
      </div>
    </div>
  )
}
