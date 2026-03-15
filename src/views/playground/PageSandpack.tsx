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
// Parses every `from 'pkg'` / `import 'pkg'` statement and resolves the
// package name (strips subpaths, handles scoped @org/pkg names).
// Unknown packages fall back to 'latest' so Sandpack can still resolve them.

function extractDeps(allSource: string): Record<string, string> {
  const deps: Record<string, string> = {}
  const seen = new Set<string>()
  // Matches both:  from 'pkg'  and  import 'pkg'
  const re = /(?:from|import)\s+['"]([^./'"][^'"]*)['"]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(allSource)) !== null) {
    const raw = m[1]
    // Resolve package name: strip subpath, keep scope
    let pkg = raw.startsWith('@')
      ? raw.split('/').slice(0, 2).join('/')   // @org/pkg(/sub) → @org/pkg
      : raw.split('/')[0]                       // pkg(/sub)       → pkg
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

// ── Text animation component keys that need a mount guard ───────────────────
const TEXT_ANIM_KEYS = new Set([
  'blur-text', 'split-text', 'shiny-text', 'gradient-text', 'rotating-text',
  'decrypted-text', 'scroll-reveal', 'scrambled-text', 'text-type', 'curved-loop',
  'fade-content', 'count-up', 'counter',
])

// ── Slot-mode App.tsx builder ─────────────────────────────────────────────────
// Generates a real webpage scaffold: nav + hero headline/sub + subtitle paragraph
// + CTA buttons ON TOP OF a background component, not floating next to it.

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
  const DEFAULT_LOGO_ITEMS = ['Acme', 'Vertex', 'Nimbus', 'Orbit', 'Pulse', 'Flux']

  const visibleItems = items
    .filter((i) => i.visible !== false && i.componentKey && registries[i.componentKey])
    .map((i) => {
      if (i.componentKey !== 'logo-loop') return i

      const logos = i.props?.logos
      const safeLogos = Array.isArray(logos) && logos.length > 0
        ? logos
        : typeof logos === 'string' && logos.trim()
          ? logos.split(',').map((s) => s.trim()).filter(Boolean)
          : DEFAULT_LOGO_ITEMS

      return {
        ...i,
        props: {
          ...i.props,
          logos: safeLogos,
        },
      }
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

  // ── Single fixed background — spans the full page ─────────────────────────
  const bgItem = visibleItems.find((i) => i.slotType === 'background')
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
    // Strip background slot — it's rendered as the page-level fixed layer above
    const sectionItems = allSectionItems.filter((i) => i.slotType !== 'background')
    if (sectionItems.length === 0) continue

    // Categorise items by slot role
    const navItem      = sectionItems.find((i) => i.slotType === 'nav')
    const headlineItem = sectionItems.find((i) => i.slotType === 'hero-headline')
    const subItem      = sectionItems.find((i) => i.slotType === 'hero-sub')
    const logoItem     = sectionItems.find((i) => i.slotType === 'logo-strip')
    const accentItem   = sectionItems.find((i) => i.slotType === 'hero-accent')
    const contentItems = sectionItems.filter((i) =>
      ['card-grid', 'gallery', 'feature-text', 'counter-row', 'cta', 'free'].includes(i.slotType)
    )
    const isHero = !!(headlineItem ?? subItem)

    // Scaffold text from section metadata (populated by fill-template AI)
    const brandName    = section.brandName    ?? 'Your Brand'
    const subtitle     = section.subtitle     ?? ''
    const ctaPrimary   = section.ctaPrimary   ?? 'Get Started'
    const ctaSecondary = section.ctaSecondary ?? 'See how it works'

    if (isHero) {
      // ── Nav bar ─────────────────────────────────────────────────────────
      const navLayer = navItem ? [
        `        <div className="absolute top-0 left-0 right-0 z-20">`,
        `          <${toPascalCase(navItem.componentKey)}`,
        `            ${serializeProps(navItem.props)}`,
        `          />`,
        `        </div>`,
      ].join('\n') : [
        `        <nav className="absolute top-0 left-0 right-0 flex justify-between items-center px-8 py-5 z-20">`,
        `          <span className="font-bold text-white text-lg tracking-tight">${brandName}</span>`,
        `          <button className="text-white/60 hover:text-white text-sm transition-colors">${ctaPrimary} →</button>`,
        `        </nav>`,
      ].join('\n')

      // ── Headline ReactBits accent ────────────────────────────────────────
      const headlineFallback = brandName
      const headlineJsx = headlineItem ? [
        `            {mounted ? (`,
        `              <${toPascalCase(headlineItem.componentKey)}`,
        `                className="text-6xl font-black text-white leading-none"`,
        `                ${serializeProps(headlineItem.props)}`,
        `              />`,
        `            ) : (`,
        `              <span style={{ fontSize: '3.75rem', fontWeight: 900, color: 'white', opacity: 0 }}>${headlineFallback}</span>`,
        `            )}`,
      ].join('\n') : ''

      // ── Sub text ReactBits accent ────────────────────────────────────────
      const subFallback = subtitle || brandName
      const subJsx = subItem ? [
        `            <div className="text-2xl text-white/90">`,
        `              {mounted ? (`,
        `                <${toPascalCase(subItem.componentKey)}`,
        `                  className="text-2xl font-medium text-white/90"`,
        `                  ${serializeProps(subItem.props)}`,
        `                />`,
        `              ) : (`,
        `                <span style={{ fontSize: '1.5rem', color: 'rgba(255,255,255,0.9)', opacity: 0 }}>${subFallback}</span>`,
        `              )}`,
        `            </div>`,
      ].join('\n') : ''

      // ── Counter row (stays inside hero) ─────────────────────────────────
      const counterItems = contentItems.filter((i) => i.slotType === 'counter-row')
      const counterJsx = counterItems.length > 0 ? [
        `            <div className="w-full max-w-3xl mt-4">`,
        ...counterItems.map((i) => [
          `              <${toPascalCase(i.componentKey)}`,
          `                ${serializeProps(i.props)}`,
          `              />`,
        ].join('\n')),
        `            </div>`,
      ].join('\n') : ''

      // ── Logo strip anchored to bottom (legacy slot) ────────────────────────
      const logoJsx = logoItem ? [
        `        <div className="absolute bottom-0 left-0 right-0 z-10 pb-2">`,
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
          `            <div style={{ width:'100%', display:'flex', justifyContent:'center', marginTop:'0.5rem' }}>`,
          `              ${inner}`,
          `            </div>`,
        ].join('\n')
      })() : ''

      sectionJsx.push([
        `        <section style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '${section.heightVh}vh', background: 'transparent', margin: 0, border: 'none' }}>`,
        navLayer,
        logoJsx,
        `          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, textAlign:'center', maxWidth:'56rem', margin:'0 auto', padding:'0 2rem', gap:'1.5rem' }}>`,
        headlineJsx,
        subJsx,
        subtitle ? `            <p style={{ fontSize:'1.25rem', color:'rgba(255,255,255,0.6)', lineHeight:1.6, maxWidth:'42rem' }}>${subtitle}</p>` : '',
        `            <div style={{ display:'flex', flexWrap:'wrap', gap:'1rem', justifyContent:'center', paddingTop:'0.5rem' }}>`,
        `              <button style={{ background:'white', color:'black', padding:'0.75rem 2rem', borderRadius:'9999px', fontWeight:600, fontSize:'0.875rem', border:'none', cursor:'pointer' }}>${ctaPrimary}</button>`,
        `              <button style={{ background:'transparent', color:'rgba(255,255,255,0.8)', padding:'0.75rem 2rem', borderRadius:'9999px', fontSize:'0.875rem', border:'1px solid rgba(255,255,255,0.2)', cursor:'pointer' }}>${ctaSecondary}</button>`,
        `            </div>`,
        accentJsx,
        counterJsx,
        `          </div>`,
        `        </section>`,
      ].filter(Boolean).join('\n'))

    } else {
      // ── Content section — typed scaffold per slot role ───────────────────
      const isCounterSection = contentItems.some((i) => i.slotType === 'counter-row')
      const isCtaSection     = contentItems.some((i) => i.slotType === 'feature-text' || i.slotType === 'cta')

      let innerContent = ''

      if (isCounterSection) {
        // Stats grid — each counter gets a centered block with a label
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
              `                <div style={{ fontSize:'4rem', fontWeight:900, color:'white', lineHeight:1 }}>${numJsx}</div>`,
              `                <div style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.2em' }}>${section.label}</div>`,
              `              </div>`,
            ].join('\n')
          }).join('\n')

        innerContent = [
          `            <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', gap:'3rem', width:'100%', maxWidth:'56rem', margin:'0 auto', padding:'2rem 0' }}>`,
          statJsx,
          `            </div>`,
        ].join('\n')

      } else if (isCtaSection) {
        // CTA block — animated text accent + description + buttons in HTML
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
          `            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'2rem', width:'100%', maxWidth:'48rem', margin:'0 auto', textAlign:'center', padding:'2rem 0' }}>`,
          `              <div style={{ fontSize:'3rem', fontWeight:900, color:'white', lineHeight:1.1 }}>`,
          `                ${ctaCompJsx}`,
          `              </div>`,
          subtitle ? `              <p style={{ fontSize:'1.125rem', color:'rgba(255,255,255,0.55)', maxWidth:'36rem' }}>${subtitle}</p>` : '',
          `              <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap', justifyContent:'center' }}>`,
          `                <button style={{ background:'white', color:'black', padding:'0.875rem 2.5rem', borderRadius:'9999px', fontWeight:600, fontSize:'0.875rem', border:'none', cursor:'pointer' }}>${ctaPrimary}</button>`,
          `                <button style={{ background:'transparent', color:'rgba(255,255,255,0.75)', padding:'0.875rem 2.5rem', borderRadius:'9999px', fontSize:'0.875rem', border:'1px solid rgba(255,255,255,0.2)', cursor:'pointer' }}>${ctaSecondary}</button>`,
          `              </div>`,
          `            </div>`,
        ].filter(Boolean).join('\n')

      } else {
        // Card grid / gallery / free — give each component a min-height container
        innerContent = contentItems.map((i) => {
          const cn = toPascalCase(i.componentKey)
          const ps = serializeProps(i.props)
          if (TEXT_ANIM_KEYS.has(i.componentKey)) {
            return [
              `            <div style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', minHeight:'12rem' }}>`,
              `              {mounted ? <${cn} ${ps} /> : null}`,
              `            </div>`,
            ].join('\n')
          }
          return [
            `            <div style={{ width:'100%', minHeight:'32rem', overflow:'hidden' }}>`,
            `              <${cn}`,
            `                ${ps}`,
            `              />`,
            `            </div>`,
          ].join('\n')
        }).join('\n')
      }

      sectionJsx.push([
        `        <section style={{ position:'relative', display:'flex', flexDirection:'column', minHeight:'${section.heightVh}vh', background:'transparent', margin:0, border:'none' }}>`,
        `          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, padding:'5rem 2rem 4rem', gap:'2rem', width:'100%' }}>`,
        `            <p style={{ fontSize:'0.7rem', letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', margin:0 }}>${section.label}</p>`,
        innerContent,
        subtitle ? `            <p style={{ fontSize:'1rem', color:'rgba(255,255,255,0.45)', maxWidth:'38rem', textAlign:'center', lineHeight:1.65, margin:0 }}>${subtitle}</p>` : '',
        `            <button style={{ background:'white', color:'black', padding:'0.75rem 2rem', borderRadius:'9999px', fontWeight:600, fontSize:'0.875rem', border:'none', cursor:'pointer' }}>${ctaPrimary}</button>`,
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
    return `        <div className="w-full min-h-[500px] relative overflow-hidden">\n          <${cn}\n            ${ps}\n          />\n        </div>`
  })

  const appCode = `import React from 'react'
${imports.join('\n')}

export default function App() {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => { setMounted(true) }, [])

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: '#09090B' }}>
${fixedBgJsx}
      <div style={{ position: 'relative', zIndex: 1 }}>
${sectionJsx.join('\n')}
${orphanJsx.length > 0 ? `        <div className="flex flex-col w-full">\n${orphanJsx.join('\n')}\n        </div>` : ''}
      </div>
    </div>
  )
}
`

  files['/App.tsx']   = { code: appCode }
  files['/index.tsx'] = { code: `import React from 'react'\nimport { createRoot } from 'react-dom/client'\nimport './index.css'\nimport App from './App'\ncreateRoot(document.getElementById('root')!).render(<App />)\n` }
  files['/index.css'] = { code: `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n* { box-sizing: border-box; margin: 0; padding: 0; }\nhtml, body { background: #09090B; overflow-x: hidden; }\n` }
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
  const DEFAULT_LOGO_ITEMS = ['Acme', 'Vertex', 'Nimbus', 'Orbit', 'Pulse', 'Flux']

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

      const logos = i.props?.logos
      const safeLogos = Array.isArray(logos) && logos.length > 0
        ? logos
        : typeof logos === 'string' && logos.trim()
          ? logos.split(',').map((s) => s.trim()).filter(Boolean)
          : DEFAULT_LOGO_ITEMS

      return {
        ...i,
        props: {
          ...i.props,
          logos: safeLogos,
        },
      }
    })
    .sort((a, b) => a.order - b.order)
  const imports: string[] = []
  const jsxRows: string[] = []
  let   halfBuffer = ''
  const flushHalves = () => {
    if (!halfBuffer) return
    jsxRows.push(`      <div className="flex flex-wrap w-full">\n${halfBuffer}      </div>`)
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
      halfBuffer += `        <div className="w-1/2 min-h-[400px] relative overflow-hidden">\n          <${varName}\n            ${ps}\n          />\n        </div>\n`
    } else {
      flushHalves()
      jsxRows.push(`      <div className="w-full min-h-[500px] relative overflow-hidden">\n        <${varName}\n          ${ps}\n        />\n      </div>`)
    }
  }
  flushHalves()

  const appCode = `import React from 'react'
${imports.join('\n')}

export default function App() {
  return (
    <div className="flex flex-col w-full min-h-screen bg-[#09090B]">
${jsxRows.join('\n')}
    </div>
  )
}
`
  files['/App.tsx']   = { code: appCode }
  files['/index.tsx'] = { code: `import React from 'react'\nimport { createRoot } from 'react-dom/client'\nimport './index.css'\nimport App from './App'\ncreateRoot(document.getElementById('root')!).render(<App />)\n` }
  files['/index.css'] = { code: `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n* { box-sizing: border-box; }\nbody { margin: 0; background: #09090B; }\n` }
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
    // Show a wireframe skeleton so the user sees the template layout while AI fills slots
    const sortedSections = [...sections].sort((a, b) => a.order - b.order)
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
                {/* Section label */}
                <div className="absolute top-3 left-4 text-[10px] text-[#52525B] font-mono tracking-widest uppercase">
                  {sec.label}
                </div>
                {/* Slot outlines */}
                <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 pt-10">
                  {secItems.map((item) => (
                    <div
                      key={item.id}
                      className="w-3/4 h-12 rounded-lg border border-dashed border-[#3F3F46] flex items-center justify-center"
                    >
                      <span className="text-[11px] text-[#3F3F46] font-mono">{item.slotType}</span>
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
