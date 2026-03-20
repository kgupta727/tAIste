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
  Sparkles,
  BookTemplate,
  Download,
  Loader2,
  CheckCircle2,
  Clock,
  PanelLeftOpen,
  X,
  Wand2,
  ChevronRight,
  Dna,
  History,
  User,
  Zap,
  Briefcase,
  BookOpen,
  Rocket,
  Palette,
  Code2,
  Minus,
  Trash2,
  RotateCcw,
} from 'lucide-react'
import JSZip from 'jszip'
import { usePlaygroundStore } from '@/src/stores/playgroundStore'
import { REGISTRY_MAP } from '@/src/playground/registry'
import { POSITION_TEMPLATES, scaffoldTemplate } from '@/src/playground/templates'
import { useBrandDNA } from '@/src/hooks/useBrandDNA'
import ComponentBrowser from './playground/ComponentBrowser'
import PlaygroundCanvas from './playground/PlaygroundCanvas'
import PropsEditor from './playground/PropsEditor'

// ── Template accent colors (for picker thumbnails) ─────────────────────────────

const TEMPLATE_ACCENTS = {
  'portfolio'      : '#C084FC',
  'saas-landing'   : '#38BDF8',
  'agency'         : '#FB923C',
  'personal-blog'  : '#34D399',
  'startup'        : '#F43F5E',
  'creative-studio': '#E879F9',
  'dark-tech'      : '#22D3EE',
  'minimal'        : '#A8A29E',
}

const TEMPLATE_CATEGORIES = {
  'portfolio'      : 'Portfolio',
  'saas-landing'   : 'SaaS',
  'agency'         : 'Agency',
  'personal-blog'  : 'Blog',
  'startup'        : 'Startup',
  'creative-studio': 'Studio',
  'dark-tech'      : 'Dev Tool',
  'minimal'        : 'Minimal',
}

// Semantic icons per template — replaces the unexplained color dot
const TEMPLATE_ICONS = {
  'portfolio'      : User,
  'saas-landing'   : Zap,
  'agency'         : Briefcase,
  'personal-blog'  : BookOpen,
  'startup'        : Rocket,
  'creative-studio': Palette,
  'dark-tech'      : Code2,
  'minimal'        : Minus,
}

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

  // ── Extract brand tokens from sections ──────────────────────────────────────
  const brandSection = canvasSections.find((s) => s.brandAccent || s.brandPrimary) ?? canvasSections[0]
  const brandBg         = brandSection?.brandBg          ?? '#09090B'
  const brandPrimary    = brandSection?.brandPrimary      ?? '#18181B'
  const brandAccent     = brandSection?.brandAccent       ?? '#A78BFA'
  const brandFontHead   = brandSection?.brandFontHeading  ?? 'Inter'
  const brandFontBody   = brandSection?.brandFontBody     ?? 'Inter'
  const brandName       = brandSection?.brandName         ?? 'My App'

  // Build Google Fonts URL
  const headSlug = brandFontHead.replace(/\s+/g, '+')
  const bodySlug = brandFontBody.replace(/\s+/g, '+')
  const fontParts = [`family=${headSlug}:wght@300;400;600;700;800;900`]
  if (brandFontBody !== brandFontHead) fontParts.push(`family=${bodySlug}:wght@300;400;500;600`)
  const fontUrl = `https://fonts.googleapis.com/css2?${fontParts.join('&')}&display=swap`

  // ── Build App.tsx ────────────────────────────────────────────────────────────
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

    // Fixed background item (z:0 page-level layer)
    const bgItem = sortedItems.find((i) => i.slotType === 'background')
    const fixedBg = bgItem && fetched[bgItem.componentKey]
      ? `  {/* Fixed background — spans full viewport */}\n  <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none' }}>\n    <${fetched[bgItem.componentKey]} ${serializePropsExport(bgItem.props)} />\n  </div>`
      : ''

    const sectionCode = sortedSections.map((section) => {
      const sectionItems = sortedItems.filter((i) => i.sectionId === section.id && i.slotType !== 'background')
      if (sectionItems.length === 0) return ''

      const secAccent = section.brandAccent ?? brandAccent
      const secName   = section.brandName   ?? brandName
      const cta1      = section.ctaPrimary  ?? 'Get Started'
      const cta2      = section.ctaSecondary ?? 'Learn more'

      const isHero = sectionItems.some((i) => ['hero-headline', 'hero-sub'].includes(i.slotType))

      if (isHero) {
        const headlineItem = sectionItems.find((i) => i.slotType === 'hero-headline')
        const subItem      = sectionItems.find((i) => i.slotType === 'hero-sub')
        const accentItem   = sectionItems.find((i) => i.slotType === 'hero-accent')
        const others       = sectionItems.filter((i) => !['hero-headline','hero-sub','hero-accent','nav','logo-strip'].includes(i.slotType))

        const headCode = headlineItem && fetched[headlineItem.componentKey]
          ? `        <${fetched[headlineItem.componentKey]} ${serializePropsExport(headlineItem.props)} />`
          : `        <h1 style={{ fontFamily:'var(--brand-font-heading)', fontSize:'clamp(2.5rem,6vw,4.5rem)', fontWeight:900, color:'white', lineHeight:1.05, letterSpacing:'-0.03em' }}>${secName}</h1>`
        const subCode = subItem && fetched[subItem.componentKey]
          ? `        <${fetched[subItem.componentKey]} ${serializePropsExport(subItem.props)} />`
          : ''
        const accentCode = accentItem && fetched[accentItem.componentKey]
          ? `        <${fetched[accentItem.componentKey]} ${serializePropsExport(accentItem.props)} />`
          : ''

        return `  {/* Hero Section */}
  <section style={{ position:'relative', display:'flex', flexDirection:'column', height:'${section.heightVh}vh', overflow:'hidden' }}>
    {/* Nav */}
    <nav style={{ position:'absolute', top:0, left:0, right:0, zIndex:20, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'1.25rem 2.5rem', background:'rgba(0,0,0,0.25)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
      <span style={{ fontFamily:'var(--brand-font-heading)', fontWeight:800, fontSize:'1.125rem', color:'white' }}>${secName}</span>
      <button style={{ background:'${secAccent}', color:'white', fontSize:'0.875rem', fontWeight:600, border:'none', cursor:'pointer', padding:'0.625rem 1.25rem', borderRadius:'9999px' }}>${cta1}</button>
    </nav>
    {/* Content */}
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, textAlign:'center', maxWidth:'58rem', margin:'0 auto', padding:'0 2.5rem', gap:'1.75rem' }}>
${headCode}
${subCode}
      <div style={{ display:'flex', gap:'0.875rem', flexWrap:'wrap', justifyContent:'center' }}>
        <button style={{ background:'${secAccent}', color:'white', padding:'0.875rem 2.25rem', borderRadius:'9999px', fontWeight:700, fontSize:'0.9rem', border:'none', cursor:'pointer', boxShadow:'0 0 28px ${secAccent}50' }}>${cta1}</button>
        <button style={{ background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.85)', padding:'0.875rem 2.25rem', borderRadius:'9999px', fontSize:'0.9rem', border:'1px solid rgba(255,255,255,0.18)', cursor:'pointer' }}>${cta2}</button>
      </div>
${accentCode ? `      ${accentCode}` : ''}
${others.map((item) => fetched[item.componentKey] ? `      <${fetched[item.componentKey]} ${serializePropsExport(item.props)} />` : '').filter(Boolean).join('\n')}
    </div>
  </section>`

      } else {
        const itemsCode = sectionItems.map((item) => {
          const slug = fetched[item.componentKey]
          if (!slug) return ''
          const ps = serializePropsExport(item.props)
          return `      <div style={{ width:'100%', minHeight:'28rem', overflow:'hidden', borderRadius:'1rem' }}>\n        <${slug} ${ps} />\n      </div>`
        }).filter(Boolean).join('\n')

        return `  {/* ${section.label} Section */}
  <section style={{ position:'relative', display:'flex', flexDirection:'column', minHeight:'${section.heightVh}vh' }}>
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, padding:'5rem 2.5rem 4rem', gap:'2.5rem', width:'100%' }}>
      <div style={{ textAlign:'center', marginBottom:'1rem' }}>
        <p style={{ fontSize:'0.65rem', letterSpacing:'0.3em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', fontFamily:'var(--brand-font-body)', marginBottom:'0.75rem' }}>${section.label.toUpperCase()}</p>
        <h2 style={{ fontSize:'clamp(2rem,5vw,3rem)', fontWeight:800, color:'white', fontFamily:'var(--brand-font-heading)', lineHeight:1.1 }}>${secName}</h2>
      </div>
${itemsCode}
      <button style={{ background:'${secAccent}', color:'white', padding:'0.75rem 2rem', borderRadius:'9999px', fontWeight:600, fontSize:'0.875rem', border:'none', cursor:'pointer', marginTop:'0.5rem' }}>${cta1}</button>
    </div>
  </section>`
      }
    }).filter(Boolean).join('\n')

    bodyCode = `  <div style={{ position:'relative', minHeight:'100vh', background:'var(--brand-bg)' }}>
${fixedBg}
    <div style={{ position:'relative', zIndex:1 }}>
${sectionCode}
    </div>
  </div>`

  } else {
    const rows = sortedItems.map((item) => {
      const slug = fetched[item.componentKey]
      if (!slug) return ''
      const ps = serializePropsExport(item.props)
      const w = item.layoutHint === 'half' ? '50%' : '100%'
      return `    <div style={{ width:'${w}', minHeight:'400px', overflow:'hidden', borderRadius:'1rem' }}>\n      <${slug} ${ps} />\n    </div>`
    }).filter(Boolean).join('\n')
    bodyCode = `  <div style={{ display:'flex', flexDirection:'column', gap:'2rem', minHeight:'100vh', background:'var(--brand-bg)', padding:'2rem' }}>\n${rows}\n  </div>`
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

  // ── index.css with brand CSS variables + Google Fonts ───────────────────────
  const indexCss = `@import url('${fontUrl}');
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

  // ── tailwind.config.js with brand color tokens ───────────────────────────────
  const tailwindConfig = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          bg:      '${brandBg}',
          primary: '${brandPrimary}',
          accent:  '${brandAccent}',
        },
      },
      fontFamily: {
        heading: ['${brandFontHead}', 'system-ui', 'sans-serif'],
        body:    ['${brandFontBody}', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
`

  // ── brand-kit.json — portable brand reference ────────────────────────────────
  const brandKit = JSON.stringify({
    generatedBy: 'tAIste — AI Brand DNA Builder',
    generatedAt: new Date().toISOString(),
    brand: {
      name: brandName,
      colors: {
        background: brandBg,
        primary: brandPrimary,
        accent: brandAccent,
      },
      typography: {
        heading: brandFontHead,
        body: brandFontBody,
      },
    },
    cssVariables: {
      '--brand-bg': brandBg,
      '--brand-primary': brandPrimary,
      '--brand-accent': brandAccent,
      '--brand-font-heading': `'${brandFontHead}', system-ui, sans-serif`,
      '--brand-font-body': `'${brandFontBody}', system-ui, sans-serif`,
    },
    tailwindTokens: {
      'brand-bg': brandBg,
      'brand-primary': brandPrimary,
      'brand-accent': brandAccent,
    },
    usage: 'Paste brand-kit.json into Claude, Cursor, or Lovable to keep your brand consistent across all AI-generated code.',
  }, null, 2)

  src.file('App.tsx', appCode)
  src.file('index.css', indexCss)
  src.file('main.tsx', `import React from 'react'\nimport { createRoot } from 'react-dom/client'\nimport './index.css'\nimport App from './App'\ncreateRoot(document.getElementById('root')!).render(<App />)\n`)

  zip.file('package.json', JSON.stringify({
    name: brandName.toLowerCase().replace(/\s+/g, '-') || 'my-landing-page',
    version: '0.1.0',
    scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
    dependencies: { react: '^18', 'react-dom': '^18', gsap: '^3', 'framer-motion': '^11', three: '^0.160', '@react-three/fiber': '^8', '@react-three/drei': '^9' },
    devDependencies: { typescript: '^5', vite: '^5', '@vitejs/plugin-react': '^4', tailwindcss: '^3', autoprefixer: '^10', postcss: '^8' },
  }, null, 2))
  zip.file('vite.config.ts', `import { defineConfig } from 'vite'\nimport react from '@vitejs/plugin-react'\nexport default defineConfig({ plugins: [react()] })\n`)
  zip.file('tailwind.config.js', tailwindConfig)
  zip.file('brand-kit.json', brandKit)
  zip.file('index.html', `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>${brandName}</title>\n</head>\n<body>\n  <div id="root"></div>\n  <script type="module" src="/src/main.tsx"></script>\n</body>\n</html>\n`)
  zip.file('README.md', `# ${brandName}

Generated by [tAIste](https://t-a-iste.vercel.app) — AI Brand DNA Builder.

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Brand Tokens

Your brand colors and fonts are in \`src/index.css\` as CSS variables and in \`tailwind.config.js\` as Tailwind tokens.

| Token | Value |
|-------|-------|
| Background | \`${brandBg}\` |
| Primary | \`${brandPrimary}\` |
| Accent | \`${brandAccent}\` |
| Heading Font | \`${brandFontHead}\` |
| Body Font | \`${brandFontBody}\` |

Paste \`brand-kit.json\` into Claude, Cursor, or Lovable to maintain brand consistency in any AI tool.
`)

  const blob = await zip.generateAsync({ type: 'blob' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${brandName.toLowerCase().replace(/\s+/g, '-') || 'landing-page'}-export.zip`
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

// ── Template wireframe preview (pure CSS, distinct per template) ───────────────

function WFNav({ accent, minimal = false }) {
  return (
    <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-2.5 z-10"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}>
      <div className="h-2 w-14 rounded-full" style={{ background: 'rgba(255,255,255,0.7)' }} />
      {!minimal && (
        <div className="flex gap-2 items-center">
          <div className="h-1.5 w-8 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
          <div className="h-5 w-14 rounded-full" style={{ background: accent }} />
        </div>
      )}
    </div>
  )
}

function TemplateWireframe({ template, accent }) {
  const id   = template.id
  const base = { background: '#0A0A0F', border: `1px solid ${accent}20` }

  // ── Portfolio: left text + right portrait + bottom masonry ─────────────────
  if (id === 'portfolio') {
    return (
      <div className="w-full h-full rounded-xl overflow-hidden relative select-none" style={base}>
        <WFNav accent={accent} />
        <div className="absolute top-0 left-0 w-1/2 h-2/3 pointer-events-none" style={{ background: `radial-gradient(ellipse at 30% 30%, ${accent}25 0%, transparent 70%)` }} />
        <div className="absolute inset-0 flex gap-4 px-6 pt-12 pb-[32%]">
          <div className="flex-1 flex flex-col justify-center gap-2.5">
            <div className="h-1.5 w-12 rounded-full" style={{ background: `${accent}80` }} />
            <div className="h-7 w-36 rounded-lg" style={{ background: 'rgba(255,255,255,0.85)' }} />
            <div className="h-2 w-28 rounded-full" style={{ background: 'rgba(255,255,255,0.35)' }} />
            <div className="h-1.5 w-32 rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }} />
            <div className="flex gap-2 mt-1.5">
              <div className="h-5 w-16 rounded-full" style={{ background: accent }} />
              <div className="h-5 w-14 rounded-full" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.18)' }} />
            </div>
          </div>
          <div className="w-[38%] rounded-xl" style={{ background: `${accent}15`, border: `1px solid ${accent}30` }} />
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[30%] px-5 pb-3 flex gap-2.5">
          <div className="flex-1 rounded-lg" style={{ background: `${accent}10`, border: `1px solid ${accent}25` }} />
          <div className="flex-1 rounded-lg" style={{ background: `${accent}08`, border: `1px solid ${accent}20` }} />
          <div className="w-[28%] rounded-lg" style={{ background: `${accent}10`, border: `1px solid ${accent}25` }} />
        </div>
      </div>
    )
  }

  // ── SaaS: centered hero + 3 feature cards ──────────────────────────────────
  if (id === 'saas-landing') {
    return (
      <div className="w-full h-full rounded-xl overflow-hidden relative select-none" style={base}>
        <WFNav accent={accent} />
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-full h-[60%] pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% 0%, ${accent}30 0%, transparent 70%)` }} />
        <div className="absolute top-[12%] bottom-[38%] left-0 right-0 flex flex-col items-center justify-center gap-2.5">
          <div className="h-4 w-20 rounded-full flex items-center justify-center" style={{ background: `${accent}20`, border: `1px solid ${accent}40` }}>
            <div className="h-1 w-12 rounded-full" style={{ background: accent }} />
          </div>
          <div className="h-7 w-44 rounded-lg" style={{ background: 'rgba(255,255,255,0.85)' }} />
          <div className="h-2 w-32 rounded-full" style={{ background: 'rgba(255,255,255,0.35)' }} />
          <div className="flex gap-2 mt-1">
            <div className="h-5 w-16 rounded-full" style={{ background: accent, boxShadow: `0 0 10px ${accent}60` }} />
            <div className="h-5 w-14 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)' }} />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[35%] px-5 pb-4 flex gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex-1 rounded-xl flex flex-col gap-2 p-3" style={{ background: `${accent}0D`, border: `1px solid ${accent}22` }}>
              <div className="w-5 h-5 rounded-md" style={{ background: `${accent}30` }} />
              <div className="h-1.5 w-3/4 rounded-full" style={{ background: 'rgba(255,255,255,0.5)' }} />
              <div className="h-1 w-full rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
              <div className="h-1 w-4/5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Agency: diagonal slash + bold left type + marquee bottom ───────────────
  if (id === 'agency') {
    return (
      <div className="w-full h-full rounded-xl overflow-hidden relative select-none" style={base}>
        <WFNav accent={accent} />
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute w-[200%] h-[35%] top-[18%] left-[-50%]" style={{ background: `${accent}14`, transform: 'rotate(-7deg)', transformOrigin: 'center' }} />
        </div>
        <div className="absolute top-[22%] left-7 right-[32%] flex flex-col gap-2.5">
          <div className="h-1.5 w-16 rounded-full" style={{ background: `${accent}70` }} />
          <div className="h-9 w-full rounded-lg" style={{ background: 'rgba(255,255,255,0.88)' }} />
          <div className="h-5 w-3/4 rounded-lg" style={{ background: 'rgba(255,255,255,0.45)' }} />
          <div className="h-2 w-2/3 rounded-full" style={{ background: 'rgba(255,255,255,0.22)' }} />
          <div className="flex gap-2 mt-2">
            <div className="h-5 w-18 rounded-full" style={{ background: accent }} />
            <div className="h-5 w-18 rounded-full" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.2)' }} />
          </div>
        </div>
        <div className="absolute top-[22%] right-4 w-[28%] h-[42%] rounded-xl" style={{ background: `${accent}20`, border: `1px solid ${accent}35` }} />
        <div className="absolute bottom-0 left-0 right-0 h-[20%] flex items-center gap-3 px-5 overflow-hidden"
          style={{ background: 'rgba(0,0,0,0.4)', borderTop: `1px solid ${accent}20` }}>
          {[80, 64, 90, 70, 76, 58].map((w, i) => (
            <div key={i} className="h-8 rounded-lg flex-shrink-0" style={{ width: `${w}px`, background: `${accent}10`, border: `1px solid ${accent}20` }} />
          ))}
        </div>
      </div>
    )
  }

  // ── Personal Blog: editorial header + 2-col article cards ─────────────────
  if (id === 'personal-blog') {
    return (
      <div className="w-full h-full rounded-xl overflow-hidden relative select-none" style={base}>
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-2.5 z-10"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.4)' }}>
          <div className="h-2 w-20 rounded-full" style={{ background: 'rgba(255,255,255,0.7)' }} />
          <div className="flex gap-3">
            {[28, 36, 24].map((w, i) => <div key={i} className="h-1.5 rounded-full" style={{ width: `${w}px`, background: 'rgba(255,255,255,0.2)' }} />)}
          </div>
        </div>
        <div className="absolute top-[18%] left-7 right-7 flex flex-col gap-2">
          <div className="h-1.5 w-10 rounded-full" style={{ background: accent }} />
          <div className="h-8 w-4/5 rounded-lg" style={{ background: 'rgba(255,255,255,0.82)' }} />
          <div className="h-2 w-2/3 rounded-full" style={{ background: 'rgba(255,255,255,0.3)' }} />
          <div className="h-1.5 w-3/4 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[44%] px-5 pb-4 flex gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="flex-1 rounded-xl flex flex-col overflow-hidden" style={{ background: `${accent}0A`, border: `1px solid ${accent}25` }}>
              <div className="h-[45%] w-full" style={{ background: `${accent}18` }} />
              <div className="flex flex-col gap-1.5 p-2.5">
                <div className="h-1.5 w-3/4 rounded-full" style={{ background: 'rgba(255,255,255,0.55)' }} />
                <div className="h-1 w-full rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
                <div className="h-1 w-4/5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Startup: centered CTA + browser product mockup + logo row ──────────────
  if (id === 'startup') {
    return (
      <div className="w-full h-full rounded-xl overflow-hidden relative select-none" style={base}>
        <WFNav accent={accent} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1/2 pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% 0%, ${accent}35 0%, transparent 70%)` }} />
        <div className="absolute top-[12%] left-0 right-0 flex flex-col items-center gap-2 px-8">
          <div className="h-3.5 w-20 rounded-full flex items-center justify-center" style={{ background: `${accent}20`, border: `1px solid ${accent}40` }}>
            <div className="h-1 w-12 rounded-full" style={{ background: accent }} />
          </div>
          <div className="h-7 w-40 rounded-lg" style={{ background: 'rgba(255,255,255,0.85)' }} />
          <div className="h-2 w-36 rounded-full" style={{ background: 'rgba(255,255,255,0.3)' }} />
          <div className="h-6 w-24 rounded-full mt-0.5" style={{ background: accent, boxShadow: `0 0 14px ${accent}60` }} />
        </div>
        <div className="absolute bottom-[14%] left-7 right-7 rounded-xl overflow-hidden" style={{ height: '34%', background: 'rgba(255,255,255,0.03)', border: `1px solid ${accent}30` }}>
          <div className="flex items-center gap-1.5 px-3 py-1.5" style={{ background: 'rgba(255,255,255,0.04)', borderBottom: `1px solid ${accent}20` }}>
            {['#ff5f57', '#febc2e', '#28c840'].map((c, i) => <div key={i} className="w-2 h-2 rounded-full" style={{ background: c, opacity: 0.7 }} />)}
            <div className="flex-1 mx-2 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }} />
          </div>
          <div className="flex gap-2 p-2.5 h-full">
            <div className="w-1/3 h-full flex flex-col gap-1.5">
              {[0, 1, 2].map(i => <div key={i} className="flex-1 rounded" style={{ background: `${accent}10` }} />)}
            </div>
            <div className="flex-1 h-full rounded" style={{ background: `${accent}08` }} />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[11%] flex items-center justify-center gap-4 px-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {[48, 40, 58, 36, 46].map((w, i) => <div key={i} className="h-1.5 rounded-full" style={{ width: `${w}px`, background: 'rgba(255,255,255,0.12)' }} />)}
        </div>
      </div>
    )
  }

  // ── Creative Studio: left image block + right text + 4-thumbnail row ───────
  if (id === 'creative-studio') {
    return (
      <div className="w-full h-full rounded-xl overflow-hidden relative select-none" style={base}>
        <WFNav accent={accent} />
        <div className="absolute inset-0 flex gap-4 px-5 pt-11 pb-[30%]">
          <div className="w-[44%] rounded-xl overflow-hidden" style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}>
            <div className="w-full h-full opacity-25" style={{ backgroundImage: `linear-gradient(${accent} 1px, transparent 1px), linear-gradient(90deg, ${accent} 1px, transparent 1px)`, backgroundSize: '14px 14px' }} />
          </div>
          <div className="flex-1 flex flex-col justify-center gap-2.5">
            <div className="h-1.5 w-10 rounded-full" style={{ background: accent }} />
            <div className="h-7 w-full rounded-lg" style={{ background: 'rgba(255,255,255,0.85)' }} />
            <div className="h-5 w-4/5 rounded-lg" style={{ background: 'rgba(255,255,255,0.4)' }} />
            <div className="h-1.5 w-3/4 rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }} />
            <div className="flex gap-2 mt-1">
              <div className="h-5 w-16 rounded-full" style={{ background: accent }} />
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[28%] px-5 pb-4 flex gap-2.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex-1 rounded-lg" style={{ background: `${accent}12`, border: `1px solid ${accent}25` }} />
          ))}
        </div>
      </div>
    )
  }

  // ── Dark Tech: terminal window + code blocks ────────────────────────────────
  if (id === 'dark-tech') {
    return (
      <div className="w-full h-full rounded-xl overflow-hidden relative select-none" style={{ ...base, background: '#050810' }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.5) 0px, rgba(255,255,255,0.5) 1px, transparent 1px, transparent 4px)' }} />
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-2.5 z-10"
          style={{ borderBottom: `1px solid ${accent}30`, background: 'rgba(0,0,0,0.6)' }}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: accent }} />
            <div className="h-1.5 w-16 rounded-full" style={{ background: 'rgba(255,255,255,0.6)' }} />
          </div>
          <div className="flex gap-2">
            {[28, 22, 32].map((w, i) => <div key={i} className="h-1.5 rounded-full" style={{ width: `${w}px`, background: `${accent}50` }} />)}
          </div>
        </div>
        <div className="absolute top-[16%] left-5 right-5 rounded-xl overflow-hidden" style={{ height: '44%', background: 'rgba(0,0,0,0.7)', border: `1px solid ${accent}40` }}>
          <div className="flex items-center gap-1.5 px-3 py-2" style={{ borderBottom: `1px solid ${accent}25`, background: 'rgba(255,255,255,0.03)' }}>
            {['#ff5f57', '#febc2e', '#28c840'].map((c, i) => <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: c, opacity: 0.7 }} />)}
            <div className="h-1 w-16 rounded-full ml-2" style={{ background: `${accent}30` }} />
          </div>
          <div className="p-3 flex flex-col gap-2">
            {[
              { w: '60%', c: accent },
              { w: '80%', c: 'rgba(255,255,255,0.4)' },
              { w: '40%', c: 'rgba(255,255,255,0.25)' },
              { w: '70%', c: accent, o: 0.6 },
            ].map((line, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-1.5 w-3 rounded-full" style={{ background: `${accent}50` }} />
                <div className="h-1.5 rounded-full" style={{ width: line.w, background: line.c, opacity: line.o ?? 1 }} />
              </div>
            ))}
          </div>
        </div>
        <div className="absolute bottom-3 left-5 right-5 flex gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="flex-1 rounded-lg p-2.5 flex flex-col gap-1.5" style={{ background: 'rgba(0,0,0,0.5)', border: `1px solid ${accent}25` }}>
              <div className="h-1.5 w-1/2 rounded-full" style={{ background: `${accent}70` }} />
              <div className="h-1 w-3/4 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
              <div className="h-1 w-2/3 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Minimal: single narrow centered column, generous whitespace ────────────
  return (
    <div className="w-full h-full rounded-xl overflow-hidden relative select-none" style={{ ...base, background: '#111113' }}>
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 py-3 z-10">
        <div className="h-2 w-10 rounded-full" style={{ background: 'rgba(255,255,255,0.6)' }} />
        <div className="h-1.5 w-8 rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }} />
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        <div className="h-1.5 w-8 rounded-full" style={{ background: `${accent}80` }} />
        <div className="h-6 w-32 rounded-lg" style={{ background: 'rgba(255,255,255,0.8)' }} />
        <div className="h-1.5 w-24 rounded-full" style={{ background: 'rgba(255,255,255,0.25)' }} />
        <div className="h-1 w-28 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }} />
        <div className="h-6 w-20 rounded-full mt-3" style={{ background: accent }} />
      </div>
    </div>
  )
}

// ── Template Picker ────────────────────────────────────────────────────────────

const FILTER_CATEGORIES = ['All', 'Portfolio', 'SaaS', 'Agency', 'Blog', 'Startup', 'Studio', 'Dev Tool', 'Minimal']

function TemplatePicker({ onClose, onSelect, isCloseable }) {
  const [selected, setSelected] = useState(POSITION_TEMPLATES[0].id)
  const [filter, setFilter]     = useState('All')
  const [hovered, setHovered]   = useState(null)

  const activeId      = hovered ?? selected
  const activeTemplate = POSITION_TEMPLATES.find((t) => t.id === activeId) ?? POSITION_TEMPLATES[0]
  const accent        = TEMPLATE_ACCENTS[activeTemplate.id] ?? '#A78BFA'

  const filtered = filter === 'All'
    ? POSITION_TEMPLATES
    : POSITION_TEMPLATES.filter((t) => TEMPLATE_CATEGORIES[t.id] === filter)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-stretch"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
      onClick={isCloseable ? onClose : undefined}
    >
      <motion.div
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.97, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        className="flex w-full h-full max-w-6xl mx-auto my-8 rounded-2xl overflow-hidden"
        style={{ background: '#0A0A0F', border: '1px solid #27272A', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Left sidebar ── */}
        <div className="w-72 flex-shrink-0 flex flex-col border-r border-[#1F1F23]">
          {/* Header */}
          <div className="px-5 py-5 border-b border-[#1F1F23]">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-[#FAFAFA] tracking-tight">Choose a Template</h2>
              {isCloseable && (
                <button onClick={onClose} className="text-[#52525B] hover:text-[#FAFAFA] transition-colors p-1 rounded">
                  <X size={15} />
                </button>
              )}
            </div>
            <p className="text-xs text-[#52525B] leading-relaxed">
              AI will fill each slot using your Brand DNA colors and fonts.
            </p>
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap gap-1.5 px-4 py-3 border-b border-[#1F1F23]">
            {FILTER_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className="px-2.5 py-1 rounded-full text-[10px] font-medium transition-all"
                style={filter === cat
                  ? { background: `${TEMPLATE_ACCENTS['saas-landing']}22`, color: TEMPLATE_ACCENTS['saas-landing'], border: `1px solid ${TEMPLATE_ACCENTS['saas-landing']}50` }
                  : { background: '#18181B', color: '#71717A', border: '1px solid #27272A' }
                }
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Template list */}
          <div className="flex-1 overflow-y-auto py-2">
            {filtered.map((t) => {
              const tAccent   = TEMPLATE_ACCENTS[t.id] ?? '#A78BFA'
              const tCategory = TEMPLATE_CATEGORIES[t.id] ?? ''
              const isActive  = selected === t.id

              const TIcon = TEMPLATE_ICONS[t.id]
              return (
                <button
                  key={t.id}
                  onClick={() => { setSelected(t.id); onSelect(t.id) }}
                  onMouseEnter={() => setHovered(t.id)}
                  onMouseLeave={() => setHovered(null)}
                  className="w-full text-left px-4 py-3 transition-all group flex items-start gap-3"
                  style={isActive
                    ? { background: `${tAccent}12`, borderLeft: `2px solid ${tAccent}` }
                    : { borderLeft: '2px solid transparent' }
                  }
                >
                  {/* Template type icon */}
                  <div className="w-7 h-7 rounded-lg flex-shrink-0 mt-0.5 flex items-center justify-center"
                    style={{ background: `${tAccent}18`, border: `1px solid ${tAccent}35` }}>
                    {TIcon && <TIcon size={13} style={{ color: tAccent }} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-sm font-semibold transition-colors ${isActive ? 'text-[#FAFAFA]' : 'text-[#A1A1AA] group-hover:text-[#FAFAFA]'}`}>
                        {t.name}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-medium flex-shrink-0"
                        style={{ background: `${tAccent}18`, color: tAccent, border: `1px solid ${tAccent}35` }}>
                        {tCategory}
                      </span>
                    </div>
                    {/* Section flow pills */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {t.sections.map((sec, idx) => (
                        <span key={sec.id} className="flex items-center gap-1">
                          <span className="text-[9px] px-1.5 py-0.5 rounded"
                            style={{ background: '#1C1C21', color: '#52525B', border: '1px solid #27272A' }}>
                            {sec.label}
                          </span>
                          {idx < t.sections.length - 1 && (
                            <ChevronRight size={8} className="text-[#3F3F46] flex-shrink-0" />
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Right preview area ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Preview header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#1F1F23] flex-shrink-0">
            <div>
              <h3 className="text-sm font-semibold text-[#FAFAFA]">{activeTemplate.name}</h3>
              <p className="text-xs text-[#52525B] mt-0.5">{activeTemplate.wireframeHint}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex flex-wrap gap-1.5">
                {activeTemplate.tags.slice(0, 4).map((tag) => (
                  <span key={tag} className="px-2 py-0.5 text-[9px] rounded font-medium"
                    style={{ background: `${accent}14`, color: accent, border: `1px solid ${accent}30` }}>
                    {tag}
                  </span>
                ))}
              </div>
              <motion.button
                key={activeTemplate.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect(activeTemplate.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all ml-2"
                style={{ background: accent, boxShadow: `0 0 20px ${accent}40` }}
              >
                Use Template
                <ChevronRight size={14} />
              </motion.button>
            </div>
          </div>

          {/* Wireframe preview */}
          <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTemplate.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full max-w-2xl"
                style={{ aspectRatio: '16/10', maxHeight: '100%' }}
              >
                <TemplateWireframe template={activeTemplate} accent={accent} />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Description footer */}
          <div className="px-6 py-4 border-t border-[#1F1F23] flex-shrink-0"
            style={{ background: `${accent}06` }}>
            <p className="text-xs text-[#71717A] leading-relaxed max-w-2xl">{activeTemplate.description}</p>
          </div>
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
  const snapshots           = usePlaygroundStore((s) => s.snapshots)
  const snapshotsLoading    = usePlaygroundStore((s) => s.snapshotsLoading)
  const fetchSnapshots      = usePlaygroundStore((s) => s.fetchSnapshots)
  const saveSnapshot        = usePlaygroundStore((s) => s.saveSnapshot)
  const restoreSnapshot     = usePlaygroundStore((s) => s.restoreSnapshot)
  const deleteSnapshot      = usePlaygroundStore((s) => s.deleteSnapshot)

  const { activeBrandDNA } = useBrandDNA()
  const activeDnaName = activeBrandDNA?.name ?? null

  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [showHistory, setShowHistory]               = useState(false)
  const [isFirstRun, setIsFirstRun]                 = useState(false)
  const [isExporting, setIsExporting]               = useState(false)
  const [exportError, setExportError]               = useState(null)
  const [fillError, setFillError]                   = useState(null)
  const [loadingDone, setLoadingDone]               = useState(false)

  // Load saved canvas + sections on mount, and fetch snapshot history
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
          setIsFirstRun(true)
          setShowTemplatePicker(true)
        }
      })
      .catch(() => {
        setIsFirstRun(true)
        setShowTemplatePicker(true)
      })
      .finally(() => setLoadingDone(true))
    fetchSnapshots()
  }, [setCanvasItems, setCanvasSections, fetchSnapshots])

  // Apply a template: scaffold empty slots, then call AI to fill them
  const handleSelectTemplate = useCallback(async (templateId) => {
    const template = POSITION_TEMPLATES.find((t) => t.id === templateId)
    if (!template) return

    const { sections, items } = scaffoldTemplate(template)
    setCanvasSections(sections)
    setCanvasItems(items)
    setShowTemplatePicker(false)
    setFillError(null)

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
      // Merge scaffold content (brandName, subtitle, CTAs, brand colors/fonts) into sections
      if (Array.isArray(json.sectionScaffolds) && json.sectionScaffolds.length > 0) {
        const updatedSections = sections.map((s) => {
          const scaffold = json.sectionScaffolds.find((sc) => sc.sectionId === s.id)
          if (!scaffold) return s
          const { sectionId: _, ...rest } = scaffold
          return { ...s, ...rest }
        })
        setCanvasSections(updatedSections)
      }
      // Auto-save snapshot after every successful AI fill
      await saveSnapshot(`${template.name} — ${new Date().toLocaleTimeString()}`, templateId)
    } catch (err) {
      setFillError(err instanceof Error ? err.message : 'AI fill failed')
    } finally {
      setIsFilling(false)
    }
  }, [setCanvasSections, setCanvasItems, applyTemplateFill, setIsFilling, saveSnapshot])

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
            <span className="ml-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
              style={{ background: '#5227FF33', color: '#B17BFF' }}>
              {snapshots.length}
            </span>
          )}
        </button>

        {/* Active DNA indicator */}
        {activeDnaName && !isFilling && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-[#111113] border border-[#3F3F46]">
            <Dna size={11} className="text-[#A78BFA]" />
            <span className="text-[#71717A]">DNA:</span>
            <span className="text-[#FAFAFA] font-medium">{activeDnaName}</span>
          </div>
        )}

        {/* AI filling indicator */}
        {isFilling && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#B17BFF] bg-[#5227FF]/10 border border-[#5227FF]/30">
            <Wand2 size={13} className="animate-pulse" />
            {activeDnaName ? `AI filling with Brand DNA: ${activeDnaName}…` : 'AI filling with your Brand DNA…'}
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
          title={canvasItems.length === 0 ? 'Add components to export' : 'Download ZIP — ready to push to GitHub'}
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
      <div className="flex flex-1 overflow-hidden relative">
        <AnimatePresence>{isBrowserOpen && <ComponentBrowser />}</AnimatePresence>
        <PlaygroundCanvas />
        <PropsEditor />

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
                  <p className="text-[10px] text-[#52525B] mt-0.5">Auto-saved on every AI fill</p>
                </div>
                <button onClick={() => setShowHistory(false)} className="text-[#52525B] hover:text-[#FAFAFA] transition-colors p-1 rounded">
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
                      No snapshots yet. History saves automatically after every AI fill.
                    </p>
                  </div>
                )}

                {snapshots.map((snap) => (
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
                      <p className="text-[10px] text-[#3F3F46] mt-0.5">
                        {snap.items.length} component{snap.items.length !== 1 ? 's' : ''}
                      </p>
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
                ))}
              </div>

              <div className="px-4 py-3 border-t border-[#1F1F23]">
                <button
                  onClick={() => saveSnapshot(`Manual save — ${new Date().toLocaleTimeString()}`)}
                  disabled={canvasItems.length === 0}
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
