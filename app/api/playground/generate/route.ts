import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/src/lib/supabase/server'
import { parseUsedComponents, VALID_COMPONENT_NAMES, APPROVED_COMPONENTS } from '@/src/playground/componentMap'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ── Call 1: Content schema ────────────────────────────────────────────────────

const CONTENT_SYSTEM = `You are a senior brand strategist and copywriter. Given a brand's extracted website content and visual DNA, write page copy that sounds like their actual marketing team wrote it. Be specific to their industry. Use real numbers, real terminology, real CTAs. Never write generic placeholder copy. Output only valid JSON, no markdown, no explanation.`

const CONTENT_SCHEMA = `{
  "companyName": "",
  "heroHeadline": "",
  "heroSubtitle": "",
  "ctaPrimary": "",
  "ctaSecondary": "",
  "eyebrow": "",
  "features": [
    { "icon": "", "title": "", "desc": "" },
    { "icon": "", "title": "", "desc": "" },
    { "icon": "", "title": "", "desc": "" }
  ],
  "stats": [
    { "value": 0, "suffix": "", "label": "" },
    { "value": 0, "suffix": "", "label": "" },
    { "value": 0, "suffix": "", "label": "" }
  ],
  "logoLoop": "",
  "closingHeadline": "",
  "closingSubtitle": ""
}`

// ── Call 3: JSX composition system prompt ─────────────────────────────────────

const JSX_SYSTEM = `You are a creative director and senior frontend engineer. Your job is to look at a brand and design a landing page that could only exist for that brand. Not a template. Not a component demo. A real page with a point of view.

RESPONSE FORMAT — return a JSON object with exactly two fields:
{
  "backgroundComponent": "Particles",
  "jsx": "<div>...full page JSX...</div>"
}
No markdown code fences. No explanation. Just valid JSON.

BACKGROUND — choose exactly one, return as backgroundComponent. Do NOT put it in jsx:
Particles, Aurora, Waves, DotGrid, LiquidChrome, Hyperspeed, Threads

AVAILABLE COMPONENTS for jsx — use only these, spelled exactly:
Text effects (use 1-2 in hero): GradientText, ShinyText, BlurIn, RotatingText, TextType, LetterSwap, SplitText
Cards (use in showcase): SpotlightCard, MagicBento, TiltCard, BounceCards, GlassCard
Animations (enhance both sections): CountUp, FadeContent, ScrollReveal, MagneticButton, ClickSpark
Supporters (fill gaps, premium moments): LogoLoop, GlowingBorder, AnimatedBorderTrail, CurvedLoop, CircularGallery

WHAT PREMIUM FEELS LIKE:
- The headline is enormous. text-8xl or bigger. It takes up space unapologetically.
- The layout is never just "centered text, then some cards." Sometimes the headline is left-aligned with a visual floating right. Sometimes a stat is so large it becomes the design element.
- There is always one moment of surprise — something the user doesn't expect.
- The hero image always appears — as a right-side floating card (rounded-2xl, shadow-2xl), or background layer at 15% opacity, or mockup frame. Use <img src={heroImageUrl} className="rounded-2xl object-cover w-full h-full" alt={companyName} />
- Buttons feel premium: primary button uses brand primary color as backgroundColor inline style, rounded-full, px-8 py-4, font-semibold. Secondary button: border border-white/20, rounded-full, px-8 py-4.
- Typography hierarchy: eyebrow text-xs uppercase tracking-widest text-white/40, headline text-8xl font-black tracking-tighter, subtitle text-xl text-white/60 max-w-2xl, body text-base text-white/50 leading-relaxed.
- Spacing is generous. Heroes pt-32 pb-24. Sections py-28. Cards p-8.
- The page has exactly 2 sections: Hero and Showcase.

HOW TO USE COMPONENTS CORRECTLY:
- GradientText: from prop = brand primary color hex, to prop = brand accent color hex. Use for the hero headline only.
- SpotlightCard: 3 cards in a CSS grid gap-6. Each card wraps custom JSX children — icon string (lucide name), title, desc from features array. Example: <SpotlightCard className="p-8 rounded-2xl bg-white/5 border border-white/10"><p className="text-white font-bold text-lg">{features[0].title}</p><p className="text-white/60 text-sm mt-2">{features[0].desc}</p></SpotlightCard>
- CountUp: from={0} to={number} ALWAYS. Never use value, count, or any other prop name. Example: <CountUp from={0} to={42000} className="text-5xl font-black text-white" />
- CurvedLoop: marqueeText prop is a plain string. Example: <CurvedLoop marqueeText={logoLoop} speed={1} curveAmount={200} />
- LogoLoop: logos prop is an array of objects. Example: logos={logoLoop.split(' • ').map((t, i) => ({ node: <span key={i} className="text-white/50 text-sm font-medium px-4">{t.trim()}</span> }))}
- MagicBento: glowColor is RGB string only (no #). Example: <MagicBento glowColor="82, 39, 255" enableSpotlight={true} enableBorderGlow={true} />
- BounceCards: images prop as string array. Example: <BounceCards images={[heroImageUrl]} containerWidth={500} containerHeight={400} />
- ScrollReveal: wraps text as children. Example: <ScrollReveal><p className="text-2xl">{heroSubtitle}</p></ScrollReveal>
- FadeContent: wraps any content block. Example: <FadeContent blur={true} duration={800}><div>...</div></FadeContent>

CONTENT VARIABLES AVAILABLE IN SCOPE (use freely in jsx expressions):
companyName, heroHeadline, heroSubtitle, ctaPrimary, ctaSecondary, eyebrow,
features (array of {icon, title, desc}), stats (array of {value, suffix, label}),
logoLoop, closingHeadline, closingSubtitle, heroImageUrl

WHAT TO AVOID:
- Never center everything. Vary alignment across sections.
- Never use hex codes as visible text anywhere.
- Never leave a component with empty or placeholder props.
- Never make two consecutive generations feel like the same layout with different colors.
- Never put background components (Particles, Aurora, Waves, etc.) inside the jsx field.
- Never ignore the hero image.`

// ── POST /api/playground/generate ────────────────────────────────────────────

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch the user's active (most recent) Brand DNA
    const { data: dnaRows } = await supabase
      .from('brand_dna')
      .select('id, name, data')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    const brandDna = dnaRows?.[0]?.data ?? null
    const brandDnaName = dnaRows?.[0]?.name ?? 'Your Brand'

    // ── Call 1: Brand copy (gpt-4o-mini) ──────────────────────────────────────

    const dnaContext = brandDna
      ? `Brand DNA:\n${JSON.stringify(brandDna, null, 2)}`
      : `Brand: ${brandDnaName}\nNo detailed DNA available — infer from the name and create compelling copy.`

    const contentCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      messages: [
        { role: 'system', content: CONTENT_SYSTEM },
        {
          role: 'user',
          content: `${dnaContext}\n\nOutput schema to fill:\n${CONTENT_SCHEMA}\n\nWrite real, specific copy for this brand. Output only the filled JSON object.`,
        },
      ],
    })

    let content: Record<string, unknown>
    try {
      const raw = contentCompletion.choices[0].message.content ?? '{}'
      content = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
    } catch {
      return NextResponse.json({ error: 'Content generation failed — invalid JSON' }, { status: 500 })
    }

    const requiredFields = ['companyName', 'heroHeadline', 'heroSubtitle', 'ctaPrimary', 'ctaSecondary', 'eyebrow', 'features', 'stats', 'logoLoop']
    for (const field of requiredFields) {
      if (!(field in content)) {
        return NextResponse.json({ error: `Content generation missing field: ${field}` }, { status: 500 })
      }
    }

    // ── Call 2: Hero image URL (no API call) ──────────────────────────────────
    // Use Picsum with companyName as seed — deterministic, always loads, no CORS.
    const companyName = (content.companyName as string) || 'brand'
    const heroImageUrl = `https://picsum.photos/seed/${encodeURIComponent(companyName)}/1200/800`

    // ── Call 3: JSX composition (gpt-4o) ─────────────────────────────────────

    const userMessage = `Brand DNA: ${JSON.stringify(brandDna ?? { name: brandDnaName })}
Content: ${JSON.stringify(content)}
Hero Image URL: ${heroImageUrl}

Design the page. Make it feel like it was built for this brand specifically. One bold layout decision. One moment of surprise. Premium every time.`

    const { backgroundComponent: bgComp, jsx: jsxOutput } = await generatePage(userMessage)

    // ── Validate + retry once ─────────────────────────────────────────────────

    const usedComponents = parseUsedComponents(jsxOutput)
    const invalid = usedComponents.filter((c) => !VALID_COMPONENT_NAMES.has(c))
    const invalidBg = !(APPROVED_COMPONENTS.backgrounds as readonly string[]).includes(bgComp)

    let finalJsx = jsxOutput
    let finalBgComp = bgComp

    if (invalid.length > 0 || invalidBg || jsxOutput.length < 500) {
      const issues = [
        invalid.length > 0
          ? `Invalid components used: [${invalid.join(', ')}]. Use ONLY: ${Object.values(APPROVED_COMPONENTS).flat().filter(n => !(APPROVED_COMPONENTS.backgrounds as readonly string[]).includes(n)).join(', ')}`
          : null,
        invalidBg
          ? `Invalid backgroundComponent "${bgComp}". Must be exactly one of: ${APPROVED_COMPONENTS.backgrounds.join(', ')}`
          : null,
        jsxOutput.length < 500 ? 'JSX too short — output a full landing page.' : null,
      ].filter(Boolean).join(' ')

      const retryMessage = `${userMessage}\n\nFix these issues and retry: ${issues}`
      const retry = await generatePage(retryMessage)
      finalJsx = retry.jsx
      finalBgComp = (APPROVED_COMPONENTS.backgrounds as readonly string[]).includes(retry.backgroundComponent)
        ? retry.backgroundComponent
        : 'Particles'
    }

    const finalComponents = parseUsedComponents(finalJsx)

    return NextResponse.json({
      content,
      heroImageUrl,
      jsx: finalJsx,
      backgroundComponent: finalBgComp,
      usedComponents: finalComponents,
      brandDnaName,
    })
  } catch (err) {
    console.error('[generate] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Generation failed' },
      { status: 500 }
    )
  }
}

async function generatePage(userMessage: string): Promise<{ backgroundComponent: string; jsx: string }> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.85,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: JSX_SYSTEM },
      { role: 'user',   content: userMessage },
    ],
    max_tokens: 4096,
  })
  try {
    const parsed = JSON.parse(completion.choices[0].message.content ?? '{}')
    return {
      backgroundComponent: parsed.backgroundComponent ?? 'Particles',
      jsx: parsed.jsx ?? '',
    }
  } catch {
    return { backgroundComponent: 'Particles', jsx: completion.choices[0].message.content ?? '' }
  }
}
