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
  }
}

Rules:
- colorPalette.primary: derive from the most frequent colors across all saves (4–6 colors)
- aestheticSignature: make it feel earned and specific to their actual taste, not generic
- visualTone.descriptors: 6–8 labels ordered by weight descending
- typography.recommendations: 3–4 real fonts that fit their aesthetic
- aestheticCoherence: rate 0–100 how internally consistent and distinctive this aesthetic is — low if the saves are all over the place, high if there's a razor-sharp singular voice. Be honest, not generous.`

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
  const colorMap: Record<string, number> = {}
  const tagMap: Record<string, number> = {}
  const moodList: string[] = []
  const typographyList: string[] = []
  const layoutList: string[] = []

  for (const row of rows) {
    const a = row.analysis || {}

    // Colors
    if (Array.isArray(a.dominantColors)) {
      for (const c of a.dominantColors) {
        if (c.hex) colorMap[c.hex] = (colorMap[c.hex] || 0) + (c.percentage || 10)
      }
    }

    // Moods
    if (Array.isArray(a.mood)) moodList.push(...a.mood)

    // Typography
    if (a.typographyStyle) typographyList.push(a.typographyStyle)

    // Layout
    if (a.layoutPattern) layoutList.push(a.layoutPattern)

    // Tags
    if (Array.isArray(row.tags)) {
      for (const t of row.tags) tagMap[t] = (tagMap[t] || 0) + 1
    }
  }

  // Top colors by frequency
  const topColors = Object.entries(colorMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([hex, score]) => ({ hex, score }))

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

  const dataContext = `
User has saved ${rows.length} design inspirations.

Top tags (by frequency): ${topTags.join(', ')}
Dominant moods across saves: ${topMoods.join(', ')}
Typography styles detected: ${topTypography.join(', ')}
Source domains: ${[...new Set(rows.map((r) => r.source_domain))].slice(0, 10).join(', ')}
Top colors (hex, cumulative score): ${topColors.slice(0, 8).map((c) => `${c.hex}(${c.score})`).join(', ')}
Layout patterns: ${[...new Set(layoutList)].slice(0, 5).join(' | ')}
`

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: BRAND_DNA_PROMPT },
      { role: 'user', content: dataContext },
    ],
    max_tokens: 1200,
    temperature: 0.3,
  })

  const raw = completion.choices[0].message.content?.trim() ?? ''
  const jsonStr = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()
  const brandDNA = JSON.parse(jsonStr)

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
  const fDiversity   = Math.min(1, uniqueDomains / Math.min(n, 10))
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
  // Keep aestheticCoherence in meta for transparency; strip nothing

  // Insert a new brand_dna row (supports multiple DNA profiles per user)
  const { data: inserted, error: insertErr } = await supabase
    .from('brand_dna')
    .insert({
      user_id: user.id,
      name: dnaName,
      data: brandDNA,
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .select('id, name, is_active, data, updated_at, created_at')
    .single()

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  return NextResponse.json({ id: inserted.id, name: inserted.name, ...brandDNA })
}
