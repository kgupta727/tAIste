'use client'

/**
 * PageSandpack — renders raw GPT-generated JSX in a Sandpack iframe.
 *
 * Receives the raw JSX string + backgroundComponent from the generate pipeline:
 *  1. Fetches source files for backgroundComponent + all usedComponents
 *  2. Builds a full App.tsx:
 *     - backgroundComponent rendered fixed at z-0 (never from GPT JSX)
 *     - GPT JSX rendered in a relative z-1 wrapper above it
 *     - Content variables injected so {features.map(...)}, {heroImageUrl} etc resolve
 *  3. Injects brand CSS variables and Google Fonts via index.css
 *  4. Passes everything to Sandpack
 *
 * Rebuilds are debounced (800 ms) so rapid JSX changes don't thrash Sandpack.
 */

import { useEffect, useRef, useState } from 'react'
import { SandpackProvider, SandpackPreview as SbPreview } from '@codesandbox/sandpack-react'
import type { SandpackFiles } from '@codesandbox/sandpack-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type RegistryFile = { path: string; content: string }
type RegistryJson = { files: RegistryFile[] }

// ── Module-level source cache ─────────────────────────────────────────────────

const sourceCache = new Map<string, RegistryJson>()

// ── Pinned package versions ───────────────────────────────────────────────────

const PINNED_VERSIONS: Record<string, string> = {
  'framer-motion'               : '^11',
  'motion'                      : '^12',
  '@gsap/react'                 : '^2',
  'gsap'                        : '^3',
  'three'                       : '^0.160',
  '@react-three/fiber'          : '^8',
  '@react-three/drei'           : '^9',
  '@react-three/postprocessing' : '^2',
  'postprocessing'              : '^6',
  'ogl'                         : '^1',
  'matter-js'                   : '^0.19',
  'leva'                        : '^0.9',
  'react-router-dom'            : '^6',
  'react-spring'                : '^9',
  '@react-spring/web'           : '^9',
  '@react-spring/three'         : '^9',
  'clsx'                        : '^2',
  'tailwind-merge'              : '^2',
  'class-variance-authority'    : '^0.7',
  'lucide-react'                : '^0.400',
  'simplex-noise'               : '^4',
  'maath'                       : '^0.10',
  'troika-three-text'           : '^0.47',
  'cannon-es'                   : '^0.20',
  'react-intersection-observer' : '^9',
  'd3'                          : '^7',
  'p5'                          : '^1',
  'tone'                        : '^14',
  'zustand'                     : '^4',
  'jotai'                       : '^2',
  'react-use'                   : '^17',
  'react-icons'                 : '^5',
  'sonner'                      : '^1',
  '@tanstack/react-query'       : '^5',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

async function fetchRegistry(pascalName: string): Promise<RegistryJson | null> {
  if (sourceCache.has(pascalName)) return sourceCache.get(pascalName)!
  try {
    const res = await fetch(`/api/reactbits?slug=${pascalName}-TS-TW.json`)
    if (!res.ok) return null
    const json: RegistryJson = await res.json()
    sourceCache.set(pascalName, json)
    return json
  } catch {
    return null
  }
}

// ── Brand CSS builder ─────────────────────────────────────────────────────────

function buildBrandCSS(opts: {
  brandBg: string
  brandPrimary: string
  brandAccent: string
  brandFontHeading: string
  brandFontBody: string
}): string {
  const { brandBg, brandPrimary, brandAccent, brandFontHeading, brandFontBody } = opts
  const headSlug = brandFontHeading.replace(/\s+/g, '+')
  const bodySlug = brandFontBody.replace(/\s+/g, '+')
  const fonts: string[] = [`family=${headSlug}:wght@300;400;600;700;800;900`]
  if (brandFontBody !== brandFontHeading) fonts.push(`family=${bodySlug}:wght@300;400;500;600`)
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
  --brand-font-heading: '${brandFontHeading}', system-ui, sans-serif;
  --brand-font-body: '${brandFontBody}', system-ui, sans-serif;
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
}

// ── Strip an unresolved component from JSX so Sandpack never crashes ──────────

function stripComponentFromJsx(jsx: string, name: string): string {
  let out = jsx.replace(new RegExp(`<${name}(\\s[^>]*)?\\s*/>`, 'g'), '')
  out = out.replace(new RegExp(`<${name}(\\s[^>]*)?>`, 'g'), '<div>')
  out = out.replace(new RegExp(`</${name}>`, 'g'), '</div>')
  return out
}

// ── App.tsx builder ───────────────────────────────────────────────────────────

function buildApp(
  jsx: string,
  usedComponents: string[],
  registries: Record<string, RegistryJson>,
  backgroundComponent: string | null | undefined,
  content?: Record<string, unknown> | null,
  heroImageUrl?: string | null,
): { files: SandpackFiles; deps: Record<string, string>; failedComponents: string[] } {
  const files: SandpackFiles  = {}
  const seenPaths = new Set<string>()
  let   allSource = ''
  const imports: string[]     = []

  // ── Sanitize JSX: strip all unresolvable component tags ───────────────────
  const failedComponents = usedComponents.filter((n) => !registries[n])
  const allJsxComponents = [...new Set(
    (jsx.match(/<([A-Z][a-zA-Z]+)/g) ?? []).map((m) => m.slice(1))
  )]
  const unknownComponents = allJsxComponents.filter((n) => !registries[n])
  const allToStrip = [...new Set([...failedComponents, ...unknownComponents])]

  let safeJsx = jsx
  for (const name of allToStrip) {
    safeJsx = stripComponentFromJsx(safeJsx, name)
  }

  // ── CountUp prop normalizer ───────────────────────────────────────────────
  safeJsx = safeJsx
    .replace(/(<CountUp[^>]*)\bvalue=\{([^}]+)\}/g,  '$1to={$2}')
    .replace(/(<CountUp[^>]*)\bcount=\{([^}]+)\}/g,  '$1to={$2}')
    .replace(/(<CountUp[^>]*)\bnumber=\{([^}]+)\}/g, '$1to={$2}')
  safeJsx = safeJsx.replace(
    /<CountUp(?![^>]*\bto=)([^>]*)(\/?>)/g,
    '<CountUp$1 from={0} to={100}$2'
  )

  // ── Bundle content components ─────────────────────────────────────────────
  for (const name of usedComponents) {
    const json = registries[name]
    if (!json) continue

    for (const file of json.files) {
      const path = file.path.startsWith('/') ? file.path : `/${file.path}`
      if (!seenPaths.has(path)) {
        files[path] = { code: file.content }
        allSource  += file.content
        seenPaths.add(path)
      }
    }

    let mainFilePath = `/${name}/${name}.tsx`
    for (const file of json.files) {
      const p = file.path.startsWith('/') ? file.path : `/${file.path}`
      if ((p.split('/').pop() ?? '').toLowerCase() === `${name.toLowerCase()}.tsx`) {
        mainFilePath = p
        break
      }
    }
    imports.push(`import ${name} from './${mainFilePath.replace(/^\//, '').replace(/\.tsx?$/, '')}'`)
  }

  // ── Bundle and import background component ────────────────────────────────
  let bgImportLine = ''
  let bgJsx = ''
  if (backgroundComponent && registries[backgroundComponent]) {
    const bgJson = registries[backgroundComponent]
    for (const file of bgJson.files) {
      const path = file.path.startsWith('/') ? file.path : `/${file.path}`
      if (!seenPaths.has(path)) {
        files[path] = { code: file.content }
        allSource  += file.content
        seenPaths.add(path)
      }
    }
    let bgFilePath = `/${backgroundComponent}/${backgroundComponent}.tsx`
    for (const file of bgJson.files) {
      const p = file.path.startsWith('/') ? file.path : `/${file.path}`
      if ((p.split('/').pop() ?? '').toLowerCase() === `${backgroundComponent.toLowerCase()}.tsx`) {
        bgFilePath = p
        break
      }
    }
    bgImportLine = `import ${backgroundComponent} from './${bgFilePath.replace(/^\//, '').replace(/\.tsx?$/, '')}'`
    bgJsx = `    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      <${backgroundComponent} />
    </div>`
  }

  const deps = extractDeps(allSource)

  // ── Inject content variables into App scope ───────────────────────────────
  // GPT expressions like {features.map(...)}, {heroImageUrl} etc resolve here.
  const safeContent  = JSON.stringify(content ?? {})
  const safeImageUrl = JSON.stringify(heroImageUrl ?? '')

  const contentVarLines = [
    `  const _c = ${safeContent};`,
    `  const companyName     = _c.companyName     ?? '';`,
    `  const heroHeadline    = _c.heroHeadline    ?? '';`,
    `  const heroSubtitle    = _c.heroSubtitle    ?? '';`,
    `  const ctaPrimary      = _c.ctaPrimary      ?? '';`,
    `  const ctaSecondary    = _c.ctaSecondary    ?? '';`,
    `  const eyebrow         = _c.eyebrow         ?? '';`,
    `  const features        = Array.isArray(_c.features) ? _c.features : [];`,
    `  const stats           = Array.isArray(_c.stats)    ? _c.stats    : [];`,
    `  const logoLoop        = _c.logoLoop        ?? '';`,
    `  const closingHeadline = _c.closingHeadline ?? '';`,
    `  const closingSubtitle = _c.closingSubtitle ?? '';`,
    `  const heroImageUrl    = ${safeImageUrl};`,
  ].join('\n')

  const indentedJsx = safeJsx
    .split('\n')
    .map((line) => `      ${line}`)
    .join('\n')

  const allImports = [
    `import React from 'react'`,
    ...(bgImportLine ? [bgImportLine] : []),
    ...imports,
  ].join('\n')

  const appCode = [
    allImports,
    ``,
    `export default function App() {`,
    `  const [mounted, setMounted] = React.useState(false)`,
    `  React.useEffect(() => { setMounted(true) }, [])`,
    `  if (!mounted) return null`,
    ``,
    contentVarLines,
    ``,
    `  return (`,
    `    <div style={{ minHeight: '100vh', position: 'relative' }}>`,
    bgJsx,
    `      <div style={{ position: 'relative', zIndex: 1 }}>`,
    indentedJsx,
    `      </div>`,
    `    </div>`,
    `  )`,
    `}`,
    ``,
  ].join('\n')

  files['/App.tsx']   = { code: appCode }
  files['/index.tsx'] = {
    code: [
      `import React from 'react'`,
      `import { createRoot } from 'react-dom/client'`,
      `import './index.css'`,
      `import App from './App'`,
      `createRoot(document.getElementById('root')!).render(<App />)`,
      ``,
    ].join('\n'),
  }

  return { files, deps, failedComponents: allToStrip }
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface PageSandpackProps {
  jsx: string
  usedComponents: string[]
  backgroundComponent?: string | null
  content?: Record<string, unknown> | null
  heroImageUrl?: string | null
  brandBg?: string
  brandPrimary?: string
  brandAccent?: string
  brandFontHeading?: string
  brandFontBody?: string
}

export default function PageSandpack({
  jsx,
  usedComponents,
  backgroundComponent,
  content,
  heroImageUrl,
  brandBg          = '#09090B',
  brandPrimary     = '#18181B',
  brandAccent      = '#A78BFA',
  brandFontHeading = 'Inter',
  brandFontBody    = 'Inter',
}: PageSandpackProps) {
  const [sandpack, setSandpack] = useState<{
    files: SandpackFiles
    deps: Record<string, string>
    key: string
  } | null>(null)
  const [loading, setLoading]             = useState(false)
  const [failedComponents, setFailed]     = useState<string[]>([])
  const [failedDismissed, setDismissed]   = useState(false)
  const buildCountRef                     = useRef(0)
  const debounceRef                       = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!jsx) {
      setSandpack(null)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setDismissed(false)

      // Fetch all content components + the background component in parallel
      const allToFetch = [
        ...usedComponents,
        ...(backgroundComponent ? [backgroundComponent] : []),
      ]
      const results = await Promise.all(
        allToFetch.map(async (name) => ({ name, json: await fetchRegistry(name) }))
      )

      const registries: Record<string, RegistryJson> = {}
      for (const { name, json } of results) {
        if (json) registries[name] = json
      }

      const { files, deps, failedComponents: failed } = buildApp(
        jsx, usedComponents, registries, backgroundComponent, content, heroImageUrl,
      )
      setFailed(failed)

      files['/index.css'] = {
        code: buildBrandCSS({ brandBg, brandPrimary, brandAccent, brandFontHeading, brandFontBody }),
      }

      buildCountRef.current += 1
      setSandpack({ files, deps, key: String(buildCountRef.current) })
      setLoading(false)
    }, 800)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jsx, usedComponents, backgroundComponent, content, heroImageUrl, brandBg, brandAccent, brandFontHeading, brandFontBody])

  if (!jsx) return null

  if (!sandpack) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-[#09090B]">
        <div className="w-5 h-5 border-2 border-[#5227FF] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-[#52525B]">Building preview…</p>
      </div>
    )
  }

  return (
    <div className="relative flex-1 overflow-hidden flex flex-col">
      {failedComponents.length > 0 && !failedDismissed && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-950/60 border-b border-amber-800/40 text-xs text-amber-400 flex-shrink-0">
          <span className="font-medium">⚠</span>
          <span className="flex-1">
            {failedComponents.join(', ')} couldn&apos;t be loaded and {failedComponents.length === 1 ? 'was' : 'were'} removed from the preview.
          </span>
          <button
            onClick={() => setDismissed(true)}
            className="ml-2 text-amber-600 hover:text-amber-400 transition-colors"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 bg-[#09090B]/60 flex items-center justify-center z-10 backdrop-blur-sm">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#111113] border border-[#3F3F46] rounded-lg">
            <div className="w-3 h-3 border border-[#5227FF] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-[#A1A1AA]">Updating…</span>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col">
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
