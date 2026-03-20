import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/src/lib/supabase/server'

const ANALYSIS_PROMPT = `Analyze this website for brand/design purposes. You are given the site's brand image (og:image or screenshot) AND extracted CSS signals from the page source. Use both together for maximum accuracy.

Return ONLY valid JSON (no markdown fences) matching this exact schema:
{
  "dominantColors": [{ "hex": "#XXXXXX", "name": "string", "percentage": number }],
  "mood": ["string"],
  "visualWeight": "light" | "heavy" | "balanced",
  "typographyStyle": "string",
  "layoutPattern": "string",
  "suggestedTags": ["string"],
  "fontNames": ["string"],
  "animationStyle": "static" | "subtle" | "bold" | "immersive",
  "animationHints": ["string"]
}
Rules:
- dominantColors: 3–5 colors. If CSS color variables were provided, use those as ground truth for hex values. Percentages should sum to 100.
- mood: 2–4 adjectives (e.g. "minimal", "bold", "editorial", "playful")
- typographyStyle: describe the typography style (infer from image + CSS font-family info)
- layoutPattern: describe the visual composition in one sentence
- suggestedTags: 3–5 lowercase kebab-case tags
- fontNames: If Google Fonts or font-family CSS was provided, use those exact names. Otherwise infer from letterforms in the image. Never write "sans-serif" generically — always give a specific name like "Inter", "Clash Display", "Neue Haas Grotesk". Return 1–3 names.
- animationStyle: "static" | "subtle" | "bold" | "immersive". If CSS context shows @keyframes, Three.js, GSAP, WebGL, or particles, lean toward "bold" or "immersive".
- animationHints: pick ALL that apply from this exact vocabulary:
  particle-field, aurora-gradient, grid-pattern, glitch, fluid-chrome,
  text-reveal, text-rotation, light-beams, dark-atmosphere, 3d-depth,
  card-gallery, bento-grid, scroll-float, logo-loop, bouncing-cards
  Return [] if none apply.`

// ── CSS + meta signal extraction ──────────────────────────────────────────────

interface PageSignals {
  fontFamilies: string[]
  colorVars: Record<string, string>
  hasAnimations: boolean
  animationKeywords: string[]
  ogImageUrl: string | null
  pageTitle: string | null
}

function extractPageSignals(html: string | null, fallbackHostname: string): PageSignals {
  const result: PageSignals = {
    fontFamilies: [],
    colorVars: {},
    hasAnimations: false,
    animationKeywords: [],
    ogImageUrl: null,
    pageTitle: null,
  }

  if (!html) return result

  // ── og:image (primary visual source) ──────────────────────────────────────
  const ogPatterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
  ]
  for (const re of ogPatterns) {
    const m = html.match(re)
    if (m?.[1] && m[1].startsWith('http')) {
      result.ogImageUrl = m[1]
      break
    }
  }

  // ── Page title ─────────────────────────────────────────────────────────────
  const titleM = html.match(/<title[^>]*>([^<]{1,120})<\/title>/i)
  result.pageTitle = titleM?.[1]?.trim().slice(0, 100) ?? `Saved from ${fallbackHostname}`

  // ── Google Fonts ───────────────────────────────────────────────────────────
  const gFontRe = /fonts\.googleapis\.com\/css[^"']*[?&]family=([^"'&]+)/g
  let m: RegExpExecArray | null
  while ((m = gFontRe.exec(html)) !== null) {
    const families = decodeURIComponent(m[1])
      .split(/[|,]/)
      .map((f) => f.split(':')[0].replace(/\+/g, ' ').trim())
      .filter(Boolean)
    result.fontFamilies.push(...families)
  }

  // ── font-family declarations ───────────────────────────────────────────────
  const fontFamilyRe = /font-family\s*:\s*([^;}"']+)/gi
  while ((m = fontFamilyRe.exec(html)) !== null) {
    const val = m[1].replace(/["']/g, '').split(',')[0].trim()
    if (val && !val.startsWith('var(') && val.toLowerCase() !== 'inherit' && val.toLowerCase() !== 'initial') {
      result.fontFamilies.push(val)
    }
  }
  result.fontFamilies = [...new Set(result.fontFamilies.filter(Boolean))].slice(0, 8)

  // ── CSS color variables ────────────────────────────────────────────────────
  const cssVarRe = /--(color-[a-z0-9-]+|primary|secondary|accent|brand-[a-z0-9-]+|background|bg|foreground|surface)\s*:\s*(#[0-9a-fA-F]{3,8}|rgb[^;)]+|hsl[^;)]+)/gi
  while ((m = cssVarRe.exec(html)) !== null) {
    result.colorVars[`--${m[1]}`] = m[2].trim()
    if (Object.keys(result.colorVars).length >= 20) break
  }

  // ── Animation signals ──────────────────────────────────────────────────────
  const checks: [RegExp, string][] = [
    [/@keyframes/i,                            '@keyframes'],
    [/animation\s*:|animation-name\s*:/i,      'animation:'],
    [/<canvas/i,                               '<canvas>'],
    [/three\.js|THREE\.|from ['"]three['"]/i,  'three.js'],
    [/gsap\.|from ['"]gsap['"]/i,              'gsap'],
    [/framer-motion|from ['"]framer/i,         'framer-motion'],
    [/webgl|WebGLRenderer/i,                   'webgl'],
    [/particles|particl/i,                     'particles'],
  ]
  for (const [re, label] of checks) {
    if (re.test(html)) result.animationKeywords.push(label)
  }
  result.hasAnimations = ['@keyframes', 'animation:', '<canvas>', 'three.js', 'webgl', 'gsap', 'framer-motion']
    .some((k) => result.animationKeywords.includes(k))

  return result
}

function buildCSSContext(signals: PageSignals): string {
  const parts: string[] = []
  if (signals.fontFamilies.length > 0) {
    parts.push(`Fonts detected in CSS/HTML: ${signals.fontFamilies.join(', ')} — use these as ground truth for fontNames`)
  }
  if (Object.keys(signals.colorVars).length > 0) {
    const colorStr = Object.entries(signals.colorVars).slice(0, 10).map(([k, v]) => `${k}: ${v}`).join('; ')
    parts.push(`CSS color variables: ${colorStr} — use these as ground truth for dominantColors hex values`)
  }
  if (signals.animationKeywords.length > 0) {
    parts.push(`Animation tech in page source: ${signals.animationKeywords.join(', ')} — use to inform animationStyle and animationHints`)
  }
  return parts.length > 0 ? `\nCSS/HTML signals extracted from page source:\n${parts.join('\n')}\n` : ''
}

// Fetch with manual timeout — works across all Node.js / edge environments
function fetchWithTimeout(url: string, options: RequestInit, ms: number): Promise<Response | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms)
    fetch(url, options)
      .then((r) => { clearTimeout(timer); resolve(r) })
      .catch(() => { clearTimeout(timer); resolve(null) })
  })
}

// Fetch an image URL and return it as a base64 data URI
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(url, { cache: 'no-store' }, 8000)
    if (!res || !res.ok) return null
    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    // Only accept actual image types
    if (!contentType.startsWith('image/')) return null
    const buf = await res.arrayBuffer()
    if (buf.byteLength < 1000) return null // too small to be useful
    return `data:${contentType};base64,${Buffer.from(buf).toString('base64')}`
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { url } = body
    if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })

    const fullUrl = url.startsWith('http') ? url : `https://${url}`
    const hostname = new URL(fullUrl).hostname

    // ── Step 1: Fetch page HTML (CSS + og:image extraction) ───────────────────
    const htmlRes = await fetchWithTimeout(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    }, 7000)

    let htmlText: string | null = null
    try {
      if (htmlRes && htmlRes.ok) htmlText = await htmlRes.text()
    } catch { /* best-effort */ }

    const signals  = extractPageSignals(htmlText, hostname)
    const cssContext = buildCSSContext(signals)
    const pageTitle  = signals.pageTitle ?? `Saved from ${hostname}`

    // ── Step 2: Get a visual image for GPT ────────────────────────────────────
    // Priority: og:image → Screenshotone (if key present) → CSS-only fallback
    let visualBase64: string | null = null
    let visualSource = 'none'

    // A. og:image (free, no API key needed)
    if (signals.ogImageUrl) {
      visualBase64 = await fetchImageAsBase64(signals.ogImageUrl)
      if (visualBase64) visualSource = 'og:image'
    }

    // B. Screenshotone (optional — if SCREENSHOTONE_ACCESS_KEY is set)
    if (!visualBase64) {
      const screenshotKey = process.env.SCREENSHOTONE_ACCESS_KEY
      if (screenshotKey) {
        const params = new URLSearchParams({
          access_key: screenshotKey,
          url: fullUrl,
          full_page: 'true',
          format: 'jpg',
          image_quality: '80',
          viewport_width: '1440',
          viewport_height: '900',
          delay: '2',
        })
        const ssRes = await fetchWithTimeout(
          `https://api.screenshotone.com/take?${params.toString()}`,
          { cache: 'no-store' },
          15000,
        )
        if (ssRes?.ok) {
          const buf = await ssRes.arrayBuffer()
          visualBase64 = `data:image/jpeg;base64,${Buffer.from(buf).toString('base64')}`
          visualSource = 'screenshot'
        }
      }
    }

    // ── Step 3: Build GPT prompt ───────────────────────────────────────────────
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    let prompt = cssContext ? `${cssContext}\n${ANALYSIS_PROMPT}` : ANALYSIS_PROMPT

    // If we have no visual at all, tell GPT to work from CSS signals only
    if (!visualBase64) {
      prompt = `You have no screenshot available. Analyze this website's brand/design based solely on the CSS and HTML signals provided below. Make reasonable inferences.\n${cssContext}\n${ANALYSIS_PROMPT}`
    }

    const messageContent: OpenAI.Chat.ChatCompletionContentPart[] = [
      { type: 'text', text: prompt },
    ]
    if (visualBase64) {
      messageContent.push({
        type: 'image_url',
        image_url: { url: visualBase64, detail: visualSource === 'og:image' ? 'high' : 'high' },
      })
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: messageContent }],
      max_tokens: 900,
    })

    const raw = completion.choices[0].message.content?.trim() ?? ''
    const jsonStr = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let analysis: any
    try {
      analysis = JSON.parse(jsonStr)
    } catch {
      return NextResponse.json({ error: 'AI returned malformed JSON — please try again.' }, { status: 500 })
    }

    // Ensure new fields with safe defaults
    analysis.fontNames      = Array.isArray(analysis.fontNames)      ? analysis.fontNames      : []
    analysis.animationStyle = analysis.animationStyle ?? (signals.hasAnimations ? 'subtle' : 'static')
    analysis.animationHints = Array.isArray(analysis.animationHints) ? analysis.animationHints : []

    // Merge CSS-detected fonts as ground truth (overrides vague GPT guesses)
    if (signals.fontFamilies.length > 0) {
      const existing = new Set(analysis.fontNames.map((f: string) => f.toLowerCase()))
      for (const f of signals.fontFamilies) {
        if (!existing.has(f.toLowerCase())) analysis.fontNames.push(f)
      }
      analysis.fontNames = analysis.fontNames.slice(0, 5)
    }

    // Return the og:image as the screenshotUrl so the swipe card renders something
    const screenshotUrl = visualBase64 ?? null

    return NextResponse.json({
      screenshotUrl,
      analysis,
      title: pageTitle,
      _meta: { visualSource },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[/api/analyze/url]', message)
    return NextResponse.json({ error: `Analysis failed: ${message}` }, { status: 500 })
  }
}
