import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/src/lib/supabase/server'

// ── ReactBits registry keys (for componentAffinities lookup table) ─────────
const REGISTRY_KEYS = [
  'aurora', 'silk', 'particles', 'iridescence', 'squares', 'waves', 'dot-grid',
  'beams', 'grid-motion', 'hyperspeed', 'letter-glitch', 'ballpit', 'orb',
  'dark-veil', 'galaxy', 'light-rays', 'threads', 'dither', 'grid-distortion',
  'lightning', 'ripple-grid', 'plasma', 'liquid-chrome', 'balatro', 'pixel-snow',
  'light-pillar', 'blur-text', 'split-text', 'shiny-text', 'gradient-text',
  'rotating-text', 'decrypted-text', 'count-up', 'scroll-reveal', 'scrambled-text',
  'text-type', 'curved-loop', 'fade-content', 'click-spark', 'magnetic-button',
  'logo-loop', 'shuffle', 'spotlight-card', 'tilted-card', 'glass-icons', 'dock',
  'magic-bento', 'bounce-cards', 'animated-list', 'circular-gallery', 'counter',
  'profile-card', 'gooey-nav', 'elastic-slider', 'card-swap', 'masonry',
  'chroma-grid', 'infinite-menu', 'flowing-menu', 'pixel-card', 'stepper',
  'carousel', 'stack', 'scroll-stack', 'glass-surface', 'pill-nav', 'card-nav',
  'bubble-menu', 'dome-gallery', 'model-viewer', 'fluid-glass', 'flying-posters',
  'staggered-menu', 'reflective-card',
] as const

const BRAND_DNA_PROMPT = `You are a brand strategist and visual designer. A user has saved design inspirations and each has been analyzed for colors, mood, typography, animation style, and layout. Based on this aggregated data, synthesize their personal Brand DNA profile.

Return ONLY valid JSON (no markdown fences) matching this EXACT schema:
{
  "meta": {
    "itemsAnalyzed": number,
    "lastAnalyzed": "just now",
    "dominantStyle": "string (e.g. 'Dark Minimalism', 'Editorial Modernism', 'Brutalist Digital')",
    "aestheticCoherence": number (0–100)
  },
  "aestheticSignature": {
    "archetype": "string (a unique, evocative title e.g. 'The Refined Technologist', 'The Digital Purist')",
    "tagline": "string (3–6 words, punchy and personal e.g. 'Precision meets warmth')",
    "description": "string (2–3 sentences, written as if speaking directly to the user — personal, insightful, not generic)",
    "influences": ["string (real designers, movements, philosophies — 3–5 items)"],
    "keywords": ["string (6 single words that define the aesthetic)"]
  },
  "colorPalette": {
    "primary": [{ "hex": "#XXXXXX", "name": "Descriptive Color Name", "percentage": number, "role": "string (e.g. Backgrounds, Text, Accent)" }],
    "accent": [{ "hex": "#XXXXXX", "name": "string", "percentage": number }],
    "neutral": [{ "hex": "#XXXXXX", "name": "string", "percentage": number }],
    "harmonyDescription": "string (2–3 sentences about the palette personality)"
  },
  "typography": {
    "detected": [{ "style": "string", "confidence": number (0–100), "description": "string" }],
    "weights": ["string (e.g. Medium, Bold)"],
    "sizeContrast": "Low" | "Moderate" | "High",
    "recommendations": [{ "name": "string (real font name)", "category": "string", "reason": "string (1 sentence)" }]
  },
  "visualTone": {
    "descriptors": [{ "label": "string", "weight": number (0.0–1.0) }],
    "contrastLevel": "Low" | "Medium" | "High",
    "whitespacePreference": "Tight" | "Moderate" | "Generous",
    "summary": "string (2–3 sentences)"
  },
  "toneOfVoice": {
    "voice": ["string (4–5 short descriptors defining how this brand communicates, e.g. 'Confident', 'Measured', 'Precise')"],
    "avoid": ["string (4–5 writing or communication pitfalls that clash with this aesthetic)"],
    "examples": [
      { "type": "good", "text": "string (a phrase that sounds authentically like this brand)" },
      { "type": "bad",  "text": "string (a phrase that clashes with this aesthetic)" },
      { "type": "good", "text": "string" },
      { "type": "bad",  "text": "string" }
    ]
  },
  "componentAffinities": [
    { "key": "string (must be a key from the ReactBits registry)", "confidence": number (0.0–1.0), "reason": "string (1 sentence citing specific evidence)" }
  ]
}

Rules:
- colorPalette.primary: derive from the most frequent colors across all saves (4–6 colors)
- aestheticSignature: make it feel earned and specific to their actual taste, not generic
- visualTone.descriptors: 6–8 labels ordered by weight descending
- typography.recommendations: 3–4 real fonts that fit their aesthetic. Prefer the fonts actually seen in their saves (topFontNames field in context) over generic suggestions.
- toneOfVoice.examples: write phrases that feel like authentic communication for THIS specific archetype — never write generic marketing copy
- aestheticCoherence: rate 0–100 how internally consistent and distinctive this aesthetic is — low if the saves are all over the place, high if there's a razor-sharp singular voice. Be honest, not generous.
- componentAffinities: return 4–8 items. Keys MUST come from the ReactBits registry provided in the context. Rank by descending confidence. Use animationHints frequency, animation style, and mood as the primary signals. Each reason must cite the specific evidence (e.g. "9 of 14 saves feature aurora-style gradient backgrounds").`

// ── HSL color clustering ──────────────────────────────────────────────────────
// More perceptually accurate than 16-step RGB bucketing because HSL separates
// near-blacks (low L), near-whites (high L), and actual hue from lightness.

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const clean = hex.replace('#', '').padEnd(6, '0')
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const d = max - min
  let h = 0, s = 0
  const l = (max + min) / 2

  if (d > 0) {
    s = d / (1 - Math.abs(2 * l - 1))
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      default: h = ((r - g) / d + 4) / 6
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 }
}

// Groups near-identical perceptual colors into the same bucket.
// Near-blacks (L<15) and near-whites (L>85) collapse regardless of hue/sat.
// Mid-tones bucket into 24 hue slices × 5 saturation bands × 10 lightness bands.
function colorBucket(hex: string): string {
  if (hex.replace('#', '').length !== 6) return hex
  const { h, s, l } = hexToHSL(hex)
  if (l < 12) return 'hsl(0,0,0)'
  if (l > 88) return 'hsl(0,0,100)'
  const hueBucket   = Math.round(h / 15) * 15
  const satBucket   = Math.round(s / 20) * 20
  const lightBucket = Math.round(l / 10) * 10
  return `hsl(${hueBucket},${satBucket},${lightBucket})`
}

// ── Typography normalizer ────────────────────────────────────────────────────
function normalizeTypography(desc: string): string {
  const d = desc.toLowerCase()
  if (d.includes('mono') || d.includes('code') || d.includes('terminal')) return 'monospace'
  if (d.includes('slab')) return 'slab serif'
  if (d.includes('script') || d.includes('cursive') || d.includes('handwritten')) return 'script / handwritten'
  if (d.includes('display') || d.includes('headline') || d.includes('decorative')) return 'display'
  if (d.includes('serif') && !d.includes('sans')) return 'serif'
  if (d.includes('humanist')) return 'humanist sans-serif'
  if (d.includes('geometric')) return 'geometric sans-serif'
  if (d.includes('sans')) return 'sans-serif'
  return desc
}

// ── Mood synonym normalizer ──────────────────────────────────────────────────
const MOOD_SYNONYMS: Record<string, string> = {
  minimalist: 'minimal', minimalistic: 'minimal', minimalism: 'minimal',
  contemporary: 'modern', current: 'modern',
  fresh: 'clean', crisp: 'clean', sleek: 'clean',
  polished: 'refined', sophisticated: 'refined', elegant: 'refined',
  moody: 'dark', dramatic: 'dark', atmospheric: 'dark',
  vibrant: 'bold', striking: 'bold', strong: 'bold',
  fun: 'playful', whimsical: 'playful',
  luxurious: 'luxury', 'high-end': 'luxury', opulent: 'luxury',
  techy: 'technical', tech: 'technical', precise: 'technical',
}
function normalizeMood(m: string): string {
  return MOOD_SYNONYMS[m.toLowerCase()] ?? m.toLowerCase()
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const dnaName: string = (body.name ?? '').trim() || `DNA #${Date.now().toString(36).toUpperCase()}`
  const folderIds: string[] | undefined = Array.isArray(body.folderIds) && body.folderIds.length > 0
    ? body.folderIds
    : undefined

  // ── Fetch inspirations (optionally scoped to specific folders) ────────────
  let query = supabase
    .from('inspirations')
    .select('title, tags, analysis, source_domain, folder_id')
    .eq('user_id', user.id)
    .order('saved_at', { ascending: false })

  if (folderIds) {
    query = query.in('folder_id', folderIds)
  }

  const { data: rows, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!rows || rows.length === 0) {
    return NextResponse.json({ error: 'No inspirations found in the selected scope' }, { status: 400 })
  }

  // ── Aggregate data for Brand DNA synthesis ────────────────────────────────
  const colorData: Record<string, { score: number; names: Record<string, number> }> = {}
  const tagMap:    Record<string, number> = {}
  const moodList:      string[] = []
  const typographyList: string[] = []
  const layoutList:    string[] = []
  const weightList:    string[] = []
  const hintFreq:      Record<string, number> = {}
  const fontFreq:      Record<string, number> = {}

  for (const row of rows) {
    const a = row.analysis || {}

    // Colors — HSL bucket to cluster perceptually similar shades
    if (Array.isArray(a.dominantColors)) {
      for (const c of a.dominantColors) {
        if (c.hex) {
          const key = colorBucket(c.hex)
          if (!colorData[key]) colorData[key] = { score: 0, names: {} }
          colorData[key].score += (c.percentage || 10)
          if (c.name) colorData[key].names[c.name] = (colorData[key].names[c.name] || 0) + 1
        }
      }
    }

    if (Array.isArray(a.mood))     moodList.push(...a.mood.map(normalizeMood))
    if (a.typographyStyle && a.typographyStyle.toLowerCase() !== 'not visible') {
      typographyList.push(normalizeTypography(a.typographyStyle))
    }
    if (a.layoutPattern)  layoutList.push(a.layoutPattern)
    if (a.visualWeight)   weightList.push(a.visualWeight)
    if (Array.isArray(row.tags)) {
      for (const t of row.tags) tagMap[t] = (tagMap[t] || 0) + 1
    }

    // New: aggregate animation hints (controlled vocabulary)
    if (Array.isArray(a.animationHints)) {
      for (const hint of a.animationHints) {
        hintFreq[hint] = (hintFreq[hint] || 0) + 1
      }
    }

    // New: aggregate font name guesses
    if (Array.isArray(a.fontNames)) {
      for (const f of a.fontNames) {
        const key = f.trim()
        if (key) fontFreq[key] = (fontFreq[key] || 0) + 1
      }
    }
  }

  // Top colors by cumulative HSL-bucketed score
  const topColors = Object.entries(colorData)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 10)
    .map(([hslKey, { score, names }]) => {
      const topName = Object.entries(names).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
      return { hslKey, score, name: topName }
    })

  const topTags = Object.entries(tagMap).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([t]) => t)

  const moodFreq: Record<string, number> = {}
  moodList.forEach((m) => { moodFreq[m] = (moodFreq[m] || 0) + 1 })
  const topMoods = Object.entries(moodFreq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([m]) => m)

  const typFreq: Record<string, number> = {}
  typographyList.forEach((t) => { typFreq[t] = (typFreq[t] || 0) + 1 })
  const topTypography = Object.entries(typFreq).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([t]) => t)

  const layoutFreq: Record<string, number> = {}
  layoutList.forEach((l) => { layoutFreq[l] = (layoutFreq[l] || 0) + 1 })
  const topLayouts = Object.entries(layoutFreq).sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([l, count]) => `${l}(×${count})`)

  const weightFreq: Record<string, number> = {}
  weightList.forEach((w) => { weightFreq[w] = (weightFreq[w] || 0) + 1 })
  const weightDesc = Object.entries(weightFreq).sort((a, b) => b[1] - a[1])
    .map(([w, count]) => `${w}(${count})`).join(', ')

  // Top animation hints
  const topAnimationHints = Object.entries(hintFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([h, n]) => `${h}(×${n})`)

  // Top font names (ground-truth from CSS + GPT inference)
  const topFontNames = Object.entries(fontFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([f, n]) => `${f}(×${n})`)

  const sampleTitles = rows
    .filter((r) => r.title?.trim())
    .slice(0, 10)
    .map((r) => r.title.trim())

  const scopeNote = folderIds
    ? `Analysis scoped to ${folderIds.length} folder(s), covering ${rows.length} inspirations.`
    : `Analysis covers all ${rows.length} saved inspirations.`

  const dataContext = `
${scopeNote}

Top tags (by frequency): ${topTags.join(', ')}
Dominant moods across saves: ${topMoods.join(', ')}
Typography styles detected: ${topTypography.length > 0 ? topTypography.join(', ') : 'none detected (saves are mostly photographic)'}
Visual weight distribution: ${weightDesc || 'not available'}
Layout patterns (by frequency): ${topLayouts.join(' | ')}
Source domains: ${[...new Set(rows.map((r) => r.source_domain))].filter(Boolean).slice(0, 10).join(', ')}
Top colors (HSL-clustered, cumulative score): ${topColors.slice(0, 8).map((c) => `${c.hslKey}${c.name ? ` "${c.name}"` : ''}(${c.score})`).join(', ')}
${sampleTitles.length > 0 ? `Sample saved titles: ${sampleTitles.join(' | ')}` : ''}
${topAnimationHints.length > 0 ? `Animation hints detected across saves: ${topAnimationHints.join(', ')}` : 'Animation hints: none detected (older saves pre-date animation analysis)'}
${topFontNames.length > 0 ? `Font names seen across saves (CSS + GPT inference): ${topFontNames.join(', ')}` : 'Font names: not available (re-analyze inspirations to populate)'}

ReactBits component registry (valid componentAffinities keys):
${REGISTRY_KEYS.join(', ')}
`

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: BRAND_DNA_PROMPT },
      { role: 'user', content: dataContext },
    ],
    max_tokens: 3000,
    temperature: 0.3,
  })

  const raw = completion.choices[0].message.content?.trim() ?? ''
  const jsonStr = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let brandDNA: any
  try {
    brandDNA = JSON.parse(jsonStr)
  } catch {
    return NextResponse.json({ error: 'AI returned malformed JSON — please try again.' }, { status: 500 })
  }

  // Sanitize componentAffinities — remove any keys not in the registry
  const validKeys = new Set(REGISTRY_KEYS as readonly string[])
  if (Array.isArray(brandDNA.componentAffinities)) {
    brandDNA.componentAffinities = brandDNA.componentAffinities.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (a: any) => a && validKeys.has(a.key)
    )
  } else {
    brandDNA.componentAffinities = []
  }

  // ── Hybrid confidence score ────────────────────────────────────────────────
  const n = rows.length
  const uniqueDomains = new Set(rows.map((r: { source_domain: string }) => r.source_domain)).size
  const totalMoodMentions = moodList.length
  const topMoodCount = totalMoodMentions > 0 ? Math.max(...Object.values(moodFreq)) : 0
  const totalColorScore = topColors.reduce((s, c) => s + c.score, 0)
  const top3ColorShare = totalColorScore > 0
    ? topColors.slice(0, 3).reduce((s, c) => s + c.score, 0) / totalColorScore : 0

  const fCount     = Math.min(1, Math.log2(n + 1) / Math.log2(22))
  const fDiversity = Math.min(1, uniqueDomains / 5)
  const fMood      = totalMoodMentions > 0 ? topMoodCount / totalMoodMentions : 0
  const fColor     = top3ColorShare

  const D = 0.30 * fCount + 0.25 * fDiversity + 0.25 * fMood + 0.20 * fColor
  const G = Math.max(0, Math.min(100, brandDNA.meta?.aestheticCoherence ?? 50)) / 100
  const confidenceScore = Math.min(97, Math.round(50 + (0.5 * D + 0.5 * G) * 47))

  brandDNA.meta.itemsAnalyzed  = n
  brandDNA.meta.confidenceScore = confidenceScore
  brandDNA.meta.lastAnalyzed   = new Date().toISOString()
  // Store scope metadata for display in the UI
  brandDNA.meta.scopedFolderIds = folderIds ?? null
  brandDNA.meta.itemCount       = n

  // Deactivate any existing active profiles before inserting the new one
  await supabase.from('brand_dna').update({ is_active: false }).eq('user_id', user.id).eq('is_active', true)

  const { data: inserted, error: insertErr } = await supabase
    .from('brand_dna')
    .insert({
      user_id: user.id,
      name: dnaName,
      data: brandDNA,
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .select('id, name, is_active, data, updated_at, created_at')
    .single()

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  return NextResponse.json({ id: inserted.id, name: inserted.name, ...brandDNA })
}
