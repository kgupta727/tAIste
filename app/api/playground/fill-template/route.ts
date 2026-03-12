import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/src/lib/supabase/server'
import { REGISTRY, REGISTRY_MAP } from '@/src/playground/registry'
import { TEMPLATE_MAP } from '@/src/playground/templates'
import type { SlotType } from '@/src/stores/playgroundStore'

// Compact catalog for prompt context
const CATALOG_BY_CATEGORY: string = REGISTRY.map(
  (c) => `${c.key} (${c.category}): ${c.description} [tags: ${c.tags.join(', ')}]`
).join('\n')

const SYSTEM_PROMPT = `You are a visual design AI that fills template slots with the best-matching UI components for a brand.

You will receive:
1. The brand's DNA profile (colors, archetype, mood, typography style).
2. A list of named slots, each with a slot type and label.
3. A catalog of available ReactBits components.

Your job: For each slot, pick ONE component from the catalog that best matches:
- The slot's purpose (e.g. 'background' → animated background, 'hero-headline' → text animation)
- The brand's aesthetic (colors, mood, archetype)

Also provide "props" overrides that customise the component to match brand DNA:
- Colors: use the brand's primary/accent hex codes when a color prop exists.
- Text props on TextAnimations components:
  - hero-headline slot → set "text" to a SHORT punchy 3-6 word headline capturing the brand essence
  - hero-sub slot → set "text" to a 3-5 word descriptor or action phrase
  - Use the brand's tagline/description as inspiration, NOT as literal copy

Return ONLY valid JSON (no markdown fences) matching this exact schema:
{
  "fills": [
    {
      "slotId": "pf-s1-bg",
      "sectionId": "pf-s1",
      "componentKey": "aurora",
      "props": { "colorStops": ["#5227FF", "#00D4FF", "#5227FF"], "amplitude": 1.2 }
    }
  ],
  "scaffold": {
    "brandName": "extracted brand name (1-3 words)",
    "subtitle": "one sentence (max 12 words) describing the brand value proposition",
    "ctaPrimary": "primary CTA (2-4 words, action verb first)",
    "ctaSecondary": "secondary CTA (2-4 words)"
  }
}

IMPORTANT:
- Props that are color arrays (e.g. colorStops, glitchColors) MUST be JSON arrays, NOT comma-separated strings.
- Only use componentKeys from the provided catalog.
- For 'background' slots: always pick from Backgrounds category.
- For 'hero-headline' or 'hero-sub': always pick from TextAnimations category.
- For 'card-grid', 'gallery': always pick from Components category.
- For 'hero-accent': pick from Animations or Components (logo-loop, elastic-line, scroll-float, etc.).
- Each slot gets exactly ONE component.
- scaffold.brandName must come from the brand DNA (company/brand name field), not invented.
- Do NOT wrap output in markdown or code fences.`

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { templateId } = body as { templateId: string }

  if (!templateId) {
    return NextResponse.json({ error: 'templateId is required' }, { status: 400 })
  }

  const template = TEMPLATE_MAP[templateId]
  if (!template) {
    return NextResponse.json({ error: `Template '${templateId}' not found` }, { status: 404 })
  }

  // Fetch active brand DNA
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

  // Build slot list for prompt
  const slots: { slotId: string; sectionId: string; slotType: SlotType; label: string; hints: string[] }[] = []
  for (const section of template.sections) {
    for (const slot of section.slots) {
      slots.push({
        slotId: slot.id,
        sectionId: section.id,
        slotType: slot.slotType,
        label: slot.label,
        hints: slot.componentHints,
      })
    }
  }

  const slotDescriptions = slots
    .map((s) => `Slot "${s.slotId}" | type: ${s.slotType} | label: ${s.label} | preferred keys: ${s.hints.join(', ')}`)
    .join('\n')

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const userMessage = `Brand DNA:\n${JSON.stringify(brandDna, null, 2)}\n\nTemplate: ${template.name}\nSlots to fill:\n${slotDescriptions}\n\nAvailable components:\n${CATALOG_BY_CATEGORY}`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.6,
      max_tokens: 2500,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    })

    const raw = completion.choices[0]?.message?.content?.trim() ?? '{}'

    let parsed: {
      fills?: Array<{ slotId: string; sectionId: string; componentKey: string; props: Record<string, unknown> }>
      scaffold?: { brandName?: string; subtitle?: string; ctaPrimary?: string; ctaSecondary?: string }
    } = {}

    try {
      const json = JSON.parse(raw)
      // Support both new object format { fills, scaffold } and legacy array format
      if (Array.isArray(json)) {
        parsed = { fills: json }
      } else {
        parsed = json
      }
    } catch {
      const stripped = raw.replace(/^```(?:json)?|```$/gm, '').trim()
      const json = JSON.parse(stripped)
      parsed = Array.isArray(json) ? { fills: json } : json
    }

    const rawFills = parsed.fills ?? []
    const scaffold = parsed.scaffold ?? {}

    // Validate fills: filter out unknown component keys, coerce color-list strings, merge registry defaults
    const validKeys = new Set(REGISTRY.map((c) => c.key))
    const validated = rawFills
      .filter((f) => validKeys.has(f.componentKey))
      .map((f) => {
        const entry = REGISTRY_MAP[f.componentKey]
        const defaults = entry
          ? entry.propSchema.reduce<Record<string, unknown>>((acc, p) => {
              acc[p.key] = p.default
              return acc
            }, {})
          : {}
        const merged = { ...defaults, ...f.props }

        // Coerce: any color-list prop that came back as a comma-string → array
        if (entry) {
          for (const p of entry.propSchema) {
            if (p.type === 'color-list' && typeof merged[p.key] === 'string') {
              merged[p.key] = (merged[p.key] as string).split(',').map((s) => s.trim()).filter(Boolean)
            }
          }
        }

        return { ...f, props: merged }
      })

    // Build per-section scaffold content (same values repeated across sections)
    const sectionScaffolds = template.sections.map((sec) => ({
      sectionId  : sec.id,
      brandName  : scaffold.brandName  ?? 'Your Brand',
      subtitle   : scaffold.subtitle   ?? 'Built for the next generation.',
      ctaPrimary : scaffold.ctaPrimary  ?? (template.pageType === 'portfolio' ? 'View Work' : template.pageType === 'agency' ? 'See Our Work' : 'Get Started'),
      ctaSecondary: scaffold.ctaSecondary ?? 'Learn more',
    }))

    return NextResponse.json({ fills: validated, sectionScaffolds })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OpenAI call failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
