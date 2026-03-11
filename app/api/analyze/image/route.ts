import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/src/lib/supabase/server'

const ANALYSIS_PROMPT = `Analyze this image for brand/design purposes. Return ONLY valid JSON (no markdown fences) matching this exact schema:
{
  "dominantColors": [{ "hex": "#XXXXXX", "name": "string", "percentage": number }],
  "mood": ["string"],
  "visualWeight": "light" | "heavy" | "balanced",
  "typographyStyle": "string",
  "layoutPattern": "string",
  "suggestedTags": ["string"]
}
Rules:
- dominantColors: 3–5 colors, percentages sum to 100, use descriptive names like "Warm Ivory"
- mood: 2–4 adjectives (e.g. "minimal", "bold", "editorial", "playful")
- typographyStyle: describe if visible, or "not visible" if it's purely photographic
- layoutPattern: describe the visual composition
- suggestedTags: 3–5 lowercase kebab-case tags (e.g. "photography", "editorial", "dark-ui", "product")`

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { imageData } = await request.json()
  if (!imageData) return NextResponse.json({ error: 'imageData required' }, { status: 400 })

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: ANALYSIS_PROMPT },
          { type: 'image_url', image_url: { url: imageData, detail: 'high' } },
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

  return NextResponse.json({ analysis })
}
