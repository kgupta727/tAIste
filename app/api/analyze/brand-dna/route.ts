import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/src/lib/supabase/server'

const BRAND_DNA_PROMPT = `You are a brand strategist and visual designer. A user has saved design inspirations and each has been analyzed for colors, mood, typography, and layout. Based on this aggregated data, synthesize their personal Brand DNA profile.

Return ONLY valid JSON (no markdown fences) matching this EXACT schema:
{
  "meta": {
    "itemsAnalyzed": number,
    "confidenceScore": number (50–97),
    "lastAnalyzed": "just now",
    "dominantStyle": "string (e.g. 'Dark Minimalism', 'Editorial Modernism', 'Brutalist Digital')"
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
- confidence score should reflect how many items were analyzed (more = higher)`

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
    temperature: 0.7,
  })

  const raw = completion.choices[0].message.content?.trim() ?? ''
  const jsonStr = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()
  const brandDNA = JSON.parse(jsonStr)
  brandDNA.meta.itemsAnalyzed = rows.length

  // Upsert to brand_dna table
  const { error: upsertErr } = await supabase
    .from('brand_dna')
    .upsert({ user_id: user.id, data: brandDNA, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })

  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 })

  return NextResponse.json(brandDNA)
}
