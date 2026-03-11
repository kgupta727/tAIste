import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/src/lib/supabase/server'

const BRAND_DNA_PROMPT = `You are a brand strategist and visual designer. A user has saved design inspirations and each has been analyzed for colors, mood, typography, and layout. Based on this aggregated data, synthesize their personal Brand DNA profile.

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
      { "type": "good", "text": "string (a phrase that sounds authentically like this brand — specific, not generic product copy)" },
      { "type": "bad",  "text": "string (a phrase that clashes with this aesthetic)" },
      { "type": "good", "text": "string" },
      { "type": "bad",  "text": "string" }
    ]
  }
}

Rules:
- colorPalette.primary: derive from the most frequent colors across all saves (4–6 colors)
- aestheticSignature: make it feel earned and specific to their actual taste, not generic
- visualTone.descriptors: 6–8 labels ordered by weight descending
- typography.recommendations: 3–4 real fonts that fit their aesthetic
- toneOfVoice.examples: write phrases that feel like authentic communication for THIS specific archetype — never write generic marketing copy
- aestheticCoherence: rate 0–100 how internally consistent and distinctive this aesthetic is — low if the saves are all over the place, high if there's a razor-sharp singular voice. Be honest, not generous.`

// Round each RGB channel to the nearest 16-step bucket so that near-identical
// hex codes (e.g. #0A0A0A vs #0D0D0D vs #111111) collapse into a single cluster
// before we count them. This prevents the dominant-color signal from fragmenting
// across dozens of perceptually identical shades.
function normalizeHex(hex: string): string {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return hex
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  const snap = (v: number) => Math.min(255, Math.round(v / 16) * 16)
  return '#' + [snap(r), snap(g), snap(b)].map((v) => v.toString(16).padStart(2, '0')).join('')
}

// Map GPT's free-form typography descriptions to a small controlled vocabulary so
// frequency counting actually produces a meaningful signal across saves.
function normalizeTypography(desc: string): string {
  const d = desc.toLowerCase()
  if (d.includes('mono') || d.includes('code') || d.includes('terminal')) return 'monospace'
  if (d.includes('slab') || d.includes('slab-serif')) return 'slab serif'
  if (d.includes('script') || d.includes('cursive') || d.includes('handwritten') || d.includes('handwriting')) return 'script / handwritten'
  if (d.includes('display') || d.includes('headline') || d.includes('decorative')) return 'display'
  if ((d.includes('serif') && !d.includes('sans'))) return 'serif'
  if (d.includes('humanist')) return 'humanist sans-serif'
  if (d.includes('geometric')) return 'geometric sans-serif'
  if (d.includes('sans')) return 'sans-serif'
  // Can't classify → keep as-is; GPT synthesis handles free-form strings fine in low volume
  return desc
}

// Normalise GPT's mood adjective synonyms to canonical forms so near-synonyms
// accumulate into one bucket instead of fragmenting the frequency signal.
const MOOD_SYNONYMS: Record<string, string> = {
  minimalist: 'minimal',
  minimalistic: 'minimal',
  minimalism: 'minimal',
  contemporary: 'modern',
  current: 'modern',
  fresh: 'clean',
  crisp: 'clean',
  sleek: 'clean',
  polished: 'refined',
  sophisticated: 'refined',
  elegant: 'refined',
  moody: 'dark',
  dramatic: 'dark',
  atmospheric: 'dark',
  vibrant: 'bold',
  striking: 'bold',
  strong: 'bold',
  fun: 'playful',
  whimsical: 'playful',
  luxurious: 'luxury',
  'high-end': 'luxury',
  opulent: 'luxury',
  techy: 'technical',
  tech: 'technical',
  precise: 'technical',
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

  // Fetch all user's inspirations
  const { data: rows, error } = await supabase
    .from('inspirations')
    .select('title, tags, analysis, source_domain')
    .eq('user_id', user.id)
    .order('saved_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!rows || rows.length === 0) {
    return NextResponse.json({ error: 'No inspirations saved yet' }, { status: 400 })
  }

  // Aggregate data to send to GPT
  const colorData: Record<string, { score: number; names: Record<string, number> }> = {}
  const tagMap: Record<string, number> = {}
  const moodList: string[] = []
  const typographyList: string[] = []
  const layoutList: string[] = []
  const weightList: string[] = []

  for (const row of rows) {
    const a = row.analysis || {}

    // Colors — normalize to buckets to cluster near-identical shades, track names
    if (Array.isArray(a.dominantColors)) {
      for (const c of a.dominantColors) {
        if (c.hex) {
          const key = normalizeHex(c.hex)
          if (!colorData[key]) colorData[key] = { score: 0, names: {} }
          colorData[key].score += (c.percentage || 10)
          if (c.name) {
            colorData[key].names[c.name] = (colorData[key].names[c.name] || 0) + 1
          }
        }
      }
    }

    // Moods — normalize synonyms before counting so "minimalist" and "minimal" merge
    if (Array.isArray(a.mood)) moodList.push(...a.mood.map(normalizeMood))

    // Typography — filter "not visible" + normalize to base category
    if (a.typographyStyle && a.typographyStyle.toLowerCase() !== 'not visible') {
      typographyList.push(normalizeTypography(a.typographyStyle))
    }

    // Layout
    if (a.layoutPattern) layoutList.push(a.layoutPattern)

    // Visual weight
    if (a.visualWeight) weightList.push(a.visualWeight)

    // Tags
    if (Array.isArray(row.tags)) {
      for (const t of row.tags) tagMap[t] = (tagMap[t] || 0) + 1
    }
  }

  // Top colors by cumulative score (clustered), carry most-used GPT name
  const topColors = Object.entries(colorData)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 10)
    .map(([hex, { score, names }]) => {
      const topName = Object.entries(names).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
      return { hex, score, name: topName }
    })

  // Top tags
  const topTags = Object.entries(tagMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([tag]) => tag)

  // Mood frequency
  const moodFreq: Record<string, number> = {}
  moodList.forEach((m) => { moodFreq[m] = (moodFreq[m] || 0) + 1 })
  const topMoods = Object.entries(moodFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([m]) => m)

  // Typography frequency
  const typFreq: Record<string, number> = {}
  typographyList.forEach((t) => { typFreq[t] = (typFreq[t] || 0) + 1 })
  const topTypography = Object.entries(typFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([t]) => t)

  // Layout frequency (preserve count so GPT knows which patterns dominate)
  const layoutFreq: Record<string, number> = {}
  layoutList.forEach((l) => { layoutFreq[l] = (layoutFreq[l] || 0) + 1 })
  const topLayouts = Object.entries(layoutFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([l, count]) => `${l}(×${count})`)

  // Visual weight distribution
  const weightFreq: Record<string, number> = {}
  weightList.forEach((w) => { weightFreq[w] = (weightFreq[w] || 0) + 1 })
  const weightDesc = Object.entries(weightFreq)
    .sort((a, b) => b[1] - a[1])
    .map(([w, count]) => `${w}(${count})`)
    .join(', ')

  // Sample of saved titles to give GPT concrete context about what the user admires
  const sampleTitles = rows
    .filter((r) => r.title && r.title.trim())
    .slice(0, 10)
    .map((r) => r.title.trim())

  const dataContext = `
User has saved ${rows.length} design inspirations.

Top tags (by frequency): ${topTags.join(', ')}
Dominant moods across saves: ${topMoods.join(', ')}
Typography styles detected: ${topTypography.length > 0 ? topTypography.join(', ') : 'none detected (saves are mostly photographic)'}
Visual weight distribution: ${weightDesc || 'not available'}
Layout patterns (by frequency): ${topLayouts.join(' | ')}
Source domains: ${[...new Set(rows.map((r) => r.source_domain))].filter(Boolean).slice(0, 10).join(', ')}
Top colors (clustered hex, cumulative score): ${topColors.slice(0, 8).map((c) => `${c.hex}${c.name ? ` "${c.name}"` : ''}(${c.score})`).join(', ')}
${sampleTitles.length > 0 ? `Sample saved titles: ${sampleTitles.join(' | ')}` : ''}
`

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: BRAND_DNA_PROMPT },
      { role: 'user', content: dataContext },
    ],
    max_tokens: 2500,
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

  // ── Hybrid confidence score ────────────────────────────────────────────────
  // D: deterministic signal quality (0–1)
  const n = rows.length
  const uniqueDomains = new Set(rows.map((r: { source_domain: string }) => r.source_domain)).size
  const totalMoodMentions = moodList.length
  const topMoodCount = totalMoodMentions > 0
    ? Math.max(...Object.values(moodFreq))
    : 0
  const totalColorScore = topColors.reduce((s, c) => s + c.score, 0)
  const top3ColorShare = totalColorScore > 0
    ? topColors.slice(0, 3).reduce((s, c) => s + c.score, 0) / totalColorScore
    : 0

  const fCount       = Math.min(1, Math.log2(n + 1) / Math.log2(22))
  // Cap at 5 unique domains (not n) — prevents over-rewarding 2 saves from 2 sites
  // and stops penalising deep single-source curation (e.g. 20 Awwwards saves)
  const fDiversity   = Math.min(1, uniqueDomains / 5)
  const fMood        = totalMoodMentions > 0 ? topMoodCount / totalMoodMentions : 0
  const fColor       = top3ColorShare

  const D = 0.30 * fCount + 0.25 * fDiversity + 0.25 * fMood + 0.20 * fColor

  // G: GPT's aesthetic coherence judgment (0–1)
  const rawCoherence = brandDNA.meta?.aestheticCoherence ?? 50
  const G = Math.max(0, Math.min(100, rawCoherence)) / 100

  // Final score: equal blend of data quality (D) and aesthetic coherence (G), scaled 50–97
  const confidenceScore = Math.min(97, Math.round(50 + (0.5 * D + 0.5 * G) * 47))

  brandDNA.meta.itemsAnalyzed = n
  brandDNA.meta.confidenceScore = confidenceScore
  brandDNA.meta.lastAnalyzed = new Date().toISOString()
  // Keep aestheticCoherence in meta for transparency; strip nothing

  // Deactivate any existing active profiles before inserting the new one
  await supabase.from('brand_dna').update({ is_active: false }).eq('user_id', user.id).eq('is_active', true)

  // Insert a new brand_dna row as the active profile
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
