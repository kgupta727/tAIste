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

  // 1. Capture full-page screenshot via Screenshotone API
  const screenshotKey = process.env.SCREENSHOTONE_ACCESS_KEY
  if (!screenshotKey) {
    return NextResponse.json({ error: 'SCREENSHOTONE_ACCESS_KEY env var not set' }, { status: 500 })
  }

  let screenshotBase64: string | null = null
  let pageTitle: string = `Saved from ${new URL(fullUrl).hostname}`

  try {
    const params = new URLSearchParams({
      access_key: screenshotKey,
      url: fullUrl,
      full_page: 'true',
      format: 'jpg',
      image_quality: '80',
      viewport_width: '1440',
      viewport_height: '900',
      delay: '1',
    })
    const res = await fetch(`https://api.screenshotone.com/take?${params}`, { next: { revalidate: 0 } })
    if (!res.ok) throw new Error(`Screenshotone returned ${res.status}`)
    const arrayBuffer = await res.arrayBuffer()
    screenshotBase64 = `data:image/jpeg;base64,${Buffer.from(arrayBuffer).toString('base64')}`
  } catch (err) {
    console.error('[url/route] Screenshot failed:', err)
  }

  if (!screenshotBase64) {
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
          { type: 'image_url', image_url: { url: screenshotBase64, detail: 'high' } },
        ],
      },
    ],
    max_tokens: 600,
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

  // screenshotBase64 is a data URI — caller's /api/upload will persist it to Supabase Storage
  return NextResponse.json({ screenshotUrl: screenshotBase64, analysis, title: pageTitle })
}
