import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/src/lib/supabase/server'

const ANALYSIS_PROMPT = `Analyze this website screenshot for brand/design purposes. Return ONLY valid JSON (no markdown fences) matching this exact schema:
{
  "dominantColors": [{ "hex": "#XXXXXX", "name": "string", "percentage": number }],
  "mood": ["string"],
  "visualWeight": "light" | "heavy" | "balanced",
  "typographyStyle": "string",
  "layoutPattern": "string",
  "suggestedTags": ["string"]
}
Rules:
- dominantColors: 3–5 colors, percentages sum to 100, use descriptive names like "Midnight Navy"
- mood: 2–4 adjectives (e.g. "minimal", "bold", "editorial", "playful")
- suggestedTags: 3–5 lowercase kebab-case tags (e.g. "dark-ui", "saas", "editorial", "developer-tools")`

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await request.json()
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })

  const fullUrl = url.startsWith('http') ? url : `https://${url}`

  // 1. Capture screenshot via Microlink
  const mlRes = await fetch(
    `https://api.microlink.io/?url=${encodeURIComponent(fullUrl)}&screenshot=true&meta=true`,
    { next: { revalidate: 0 } }
  )
  const mlData = await mlRes.json()

  const screenshotUrl: string | null = mlData?.data?.screenshot?.url ?? null
  const pageTitle: string = mlData?.data?.title ?? `Saved from ${new URL(fullUrl).hostname}`

  if (!screenshotUrl) {
    return NextResponse.json({ error: 'Could not capture screenshot for this URL' }, { status: 422 })
  }

  // 2. Analyze with GPT-4o Vision
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: ANALYSIS_PROMPT },
          { type: 'image_url', image_url: { url: screenshotUrl, detail: 'low' } },
        ],
      },
    ],
    max_tokens: 600,
  })

  const raw = completion.choices[0].message.content?.trim() ?? ''
  const jsonStr = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()
  const analysis = JSON.parse(jsonStr)

  return NextResponse.json({ screenshotUrl, analysis, title: pageTitle })
}
