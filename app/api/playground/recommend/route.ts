import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/src/lib/supabase/server'
import { REGISTRY, REGISTRY_MAP } from '@/src/playground/registry'
type LayoutHint = 'full' | 'half'

// Build a compact catalog description to include in the prompt
const CATALOG_SUMMARY = REGISTRY.map(
  (c) => `${c.key} (${c.category}): ${c.description} [tags: ${c.tags.join(', ')}]`
).join('\n')

const SYSTEM_PROMPT = `You are a visual design AI that recommends UI components for a brand's landing page.

You will receive:
1. The brand's DNA profile (colors, archetype, mood, typography style).
2. A catalog of available ReactBits components.

Your job: Select 8–12 components that best match the brand's aesthetic and purpose.
For each pick, also provide:
- "customizedProps": a flat object of prop overrides (keys must exist in the component's available props)
- "layoutHint": "full" or "half"
- "reason": one sentence explaining why this component fits the brand

Return ONLY valid JSON (no markdown fences) matching this schema:
[
  {
    "componentKey": "aurora",
    "customizedProps": { "colorStops": ["#3B82F6", "#6366F1", "#3B82F6"] },
    "layoutHint": "full",
    "reason": "The aurora creates an immersive premium feel matching the luxury archetype."
  }
]

Rules:
- Only use componentKeys that appear in the provided catalog.
- Vary the categories — include a mix of backgrounds, text animations, and UI components.
- Customise colors to match the brand's primary and accent hex codes when relevant.
- Props that are color arrays (e.g. colorStops, glitchColors) MUST be JSON arrays of hex strings, NOT comma-separated strings.
- Do NOT wrap output in markdown or code fences.`

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch the active brand DNA
  const { data: dnaRows, error: dnaError } = await supabase
    .from('brand_dna')
    .select('data')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)

  if (dnaError) return NextResponse.json({ error: dnaError.message }, { status: 500 })

  const brandDna = dnaRows?.[0]?.data
  if (!brandDna) {
    return NextResponse.json(
      { error: 'No active Brand DNA found. Generate your Brand DNA first.' },
      { status: 400 }
    )
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const userMessage = `Brand DNA:\n${JSON.stringify(brandDna, null, 2)}\n\nAvailable components:\n${CATALOG_SUMMARY}`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 2000,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    })

    const raw = completion.choices[0]?.message?.content?.trim() ?? '[]'

    let picks: Array<{
      componentKey: string
      customizedProps: Record<string, unknown>
      layoutHint: LayoutHint
      reason: string
    }> = []

    try {
      picks = JSON.parse(raw)
    } catch {
      // GPT occasionally wraps in backticks despite instructions — strip them
      const stripped = raw.replace(/^```(?:json)?|```$/gm, '').trim()
      picks = JSON.parse(stripped)
    }

    // Validate picks — filter out any unknown component keys, coerce color-list strings
    const validKeys = new Set(REGISTRY.map((c) => c.key))
    const validated = picks
      .filter((p) => validKeys.has(p.componentKey))
      .map((p) => {
        const entry = REGISTRY_MAP[p.componentKey]
        if (entry && p.customizedProps) {
          for (const prop of entry.propSchema) {
            if (prop.type === 'color-list' && typeof p.customizedProps[prop.key] === 'string') {
              p.customizedProps[prop.key] = (p.customizedProps[prop.key] as string)
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            }
          }
        }
        return p
      })

    return NextResponse.json({ picks: validated })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
