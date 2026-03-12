'use client'

/**
 * SandpackPreview — renders a single ReactBits component in an isolated
 * in-browser Sandpack sandbox.
 *
 * Flow:
 *  1. Derive the registry URL from componentKey (TypeScript + Tailwind variant).
 *  2. Fetch the component source JSON from reactbits.dev/r/ (cached per key).
 *  3. Build a minimal Sandpack file-tree around the fetched source.
 *  4. Render <SandpackPreview> in preview-only mode (no editor visible).
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  SandpackProvider,
  SandpackPreview as SbPreview,
} from '@codesandbox/sandpack-react'
import type { SandpackFiles } from '@codesandbox/sandpack-react'
import type { ComponentEntry } from '@/src/playground/registry'

// Actual shape returned by reactbits.dev registry API
type RegistryFile = { path: string; content: string; type: string }
type RegistryJson = { files: RegistryFile[] }

// ── Module-level cache to avoid redundant network requests ───────────────────
const sourceCache = new Map<string, RegistryJson>()

// ── Helpers ──────────────────────────────────────────────────────────────────

function registryUrl(componentKey: string) {
  // PascalCase slug, TS-TW variant
  const slug = componentKey
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')
  // Proxy through Next.js API to avoid CORS on browser-side fetches
  return `/api/reactbits?slug=${slug}-TS-TW.json`
}

// Serialize props so they appear as JSX attribute literals in the app file.
function serializeProps(props: Record<string, unknown>): string {
  return Object.entries(props)
    .map(([k, v]) => {
      if (typeof v === 'string') return `${k}="${v}"`
      if (typeof v === 'boolean') return v ? k : `${k}={false}`
      if (typeof v === 'number') return `${k}={${v}}`
      // Arrays (e.g. color-list) → {["#111","#222"]}
      if (Array.isArray(v)) return `${k}={${JSON.stringify(v)}}`
      return `${k}={${JSON.stringify(v)}}`
    })
    .join('\n    ')
}

// All npm packages that ReactBits components might use.
// We only inject the ones actually referenced in the component source
// to avoid unnecessary CDN fetches that time out.
const KNOWN_DEPS: Record<string, string> = {
  'framer-motion'      : '^11',
  'motion'             : '^11',   // framer-motion v12+ alias
  '@gsap/react'        : '^2',
  'gsap'               : '^3',
  'three'              : '^0.160',
  '@react-three/fiber' : '^8',
  '@react-three/drei'  : '^9',
  'ogl'                : '^1',
  'matter-js'          : '^0.19',
  'leva'               : '^0.9',
}

function detectDeps(source: string): Record<string, string> {
  const deps: Record<string, string> = {}
  for (const [pkg, version] of Object.entries(KNOWN_DEPS)) {
    if (source.includes(`'${pkg}'`) || source.includes(`"${pkg}"`)) {
      deps[pkg] = version
    }
  }
  return deps
}

// Build the minimal Sandpack file tree from a registry JSON response.
// Registry shape: { files: Array<{ path: string, content: string }> }
// Paths are like "Particles/Particles.tsx" — no leading slash.
function buildFiles(
  registryJson: RegistryJson,
  componentName: string,
  props: Record<string, unknown>
): SandpackFiles & { __deps?: Record<string, string> } {
  const files: SandpackFiles = {}
  let mainFilePath = `/${componentName}/${componentName}.tsx` // best guess
  let allSource = ''

  for (const file of registryJson.files) {
    // Sandpack requires paths to start with /
    const path = file.path.startsWith('/') ? file.path : `/${file.path}`
    files[path] = { code: file.content }
    allSource += file.content

    // Identify the main component file
    const filename = path.split('/').pop() ?? ''
    if (
      filename === `${componentName}.tsx` ||
      filename === `${componentName}.ts` ||
      filename.toLowerCase() === `${componentName.toLowerCase()}.tsx`
    ) {
      mainFilePath = path
    }
  }

  // Import path relative to /App.tsx (e.g. /Particles/Particles.tsx → ./Particles/Particles)
  const relImport = `./${mainFilePath.replace(/^\//, '').replace(/\.tsx?$/, '')}`

  const propsStr = serializeProps(props)
  const appCode = `import React from 'react'
import ${componentName} from '${relImport}'

export default function App() {
  return (
    <div className="flex items-center justify-center w-full min-h-screen bg-[#09090B]">
      <${componentName}
        ${propsStr}
      />
    </div>
  )
}
`
  files['/App.tsx'] = { code: appCode }
  files['/index.tsx'] = {
    code: `import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
createRoot(document.getElementById('root')!).render(<App />)
`,
  }
  files['/index.css'] = {
    code: `@tailwind base;
@tailwind components;
@tailwind utilities;

* { box-sizing: border-box; }
body { margin: 0; background: #09090B; }
`,
  }

  ;(files as Record<string, unknown>).__deps = detectDeps(allSource)

  return files
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  entry: ComponentEntry
  props: Record<string, unknown>
  /** Height of the preview iframe in pixels. Defaults to 320. */
  height?: number
  /** If true, show a loading skeleton while fetching. */
  showLoader?: boolean
}

export default function SandpackPreview({
  entry,
  props,
  height = 320,
  showLoader = true,
}: Props) {
  const [sandpack, setSandpack] = useState<{ files: SandpackFiles; deps: Record<string, string> } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  // Derive PascalCase name from registry entry key
  const componentName = useMemo(
    () =>
      entry.key
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(''),
    [entry.key]
  )

  useEffect(() => {
    mountedRef.current = true
    setError(null)

    const cacheKey = entry.key
    if (sourceCache.has(cacheKey)) {
      const raw = sourceCache.get(cacheKey)!
      const built = buildFiles(raw, componentName, props)
      const { __deps, ...pureFiles } = built as Record<string, unknown>
      if (mountedRef.current) setSandpack({ files: pureFiles as SandpackFiles, deps: (__deps ?? {}) as Record<string, string> })
      return
    }

    const url = registryUrl(entry.key)
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Registry fetch failed: ${r.status}`)
        return r.json()
      })
      .then((json: RegistryJson) => {
        if (!mountedRef.current) return
        const built = buildFiles(json, componentName, props)
        const { __deps, ...pureFiles } = built as Record<string, unknown>
        sourceCache.set(cacheKey, json)
        setSandpack({ files: pureFiles as SandpackFiles, deps: (__deps ?? {}) as Record<string, string> })
      })
      .catch((e: Error) => {
        if (mountedRef.current) setError(e.message)
      })

    return () => {
      mountedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.key])

  // Re-derive App.tsx whenever props change (after initial load)
  useEffect(() => {
    if (!sandpack) return
    const cacheKey = entry.key
    const raw = sourceCache.get(cacheKey)
    if (!raw) return
    const rebuilt = buildFiles(raw, componentName, props)
    const { __deps, ...pureFiles } = rebuilt as Record<string, unknown>
    setSandpack({ files: pureFiles as SandpackFiles, deps: (__deps ?? {}) as Record<string, string> })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props])

  if (error) {
    return (
      <div
        className="flex items-center justify-center text-xs text-red-400 bg-[#1A1A1F] rounded-lg border border-red-900/40"
        style={{ height }}
      >
        Failed to load {entry.name}
      </div>
    )
  }

  if (!sandpack) {
    if (!showLoader) return null
    return (
      <div
        className="bg-[#09090B] rounded-lg border border-[#3F3F46] animate-pulse"
        style={{ height }}
      />
    )
  }

  return (
    <SandpackProvider
      files={sandpack.files}
      template="react-ts"
      theme="dark"
      options={{
        externalResources: ['https://cdn.tailwindcss.com'],
      }}
      customSetup={{
        dependencies: {
          react: '^18',
          'react-dom': '^18',
          ...sandpack.deps,
        },
      }}
    >
      <SbPreview
        style={{ height }}
        showOpenInCodeSandbox={false}
        showRefreshButton={false}
      />
    </SandpackProvider>
  )
}


