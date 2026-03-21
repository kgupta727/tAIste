import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/src/lib/supabase/server'
import { parseUsedComponents } from '@/src/playground/componentMap'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * POST /api/playground/swap
 *
 * Targeted component swap: generates JSX for a single new component
 * populated with the brand's content, then injects it into the page JSX
 * in place of the old component.
 *
 * Body: { currentComponent, newComponent, pageJsx, content }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { currentComponent, newComponent, pageJsx, content } = await request.json()

    if (!currentComponent || !newComponent || !pageJsx) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Fetch the user's active Brand DNA
    const { data: dnaRows } = await supabase
      .from('brand_dna')
      .select('data')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    const brandDna = dnaRows?.[0]?.data ?? null

    // Generate JSX for just the new component
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: `You are a frontend engineer. Return only the JSX for a single ReactBits component with correct props filled from the brand DNA and content provided. No imports, no wrapper divs, no export, no explanation. Just the component JSX — one root element.`,
        },
        {
          role: 'user',
          content: `Component to render: ${newComponent}
Brand DNA: ${JSON.stringify(brandDna ?? {})}
Content: ${JSON.stringify(content ?? {})}

Return only the JSX for this component, fully populated with real content. No imports. No explanation.`,
        },
      ],
    })

    const newComponentJSX = (completion.choices[0].message.content ?? '')
      .replace(/```jsx\n?/g, '')
      .replace(/```tsx\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    // Replace the old component in the page JSX
    const updatedJsx = injectComponentIntoPage(currentComponent, newComponentJSX, pageJsx)
    const updatedComponents = parseUsedComponents(updatedJsx)

    return NextResponse.json({ jsx: updatedJsx, usedComponents: updatedComponents })
  } catch (err) {
    console.error('[swap] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Swap failed' },
      { status: 500 }
    )
  }
}

/**
 * Replace the first occurrence of oldName's JSX tags with newJsx.
 * Tries self-closing (<Foo />) first, then wrapping (<Foo>...</Foo>).
 */
function injectComponentIntoPage(oldName: string, newJsx: string, pageJsx: string): string {
  // Self-closing: <OldName ... />
  const selfClosingRe = new RegExp(`<${oldName}(\\s[^>]*)?\\s*\\/>`, 'g')
  const afterSelf = pageJsx.replace(selfClosingRe, newJsx)
  if (afterSelf !== pageJsx) return afterSelf

  // Wrapping: <OldName ...>...</OldName>
  const wrappingRe = new RegExp(`<${oldName}(\\s[^>]*)?>([\\s\\S]*?)<\\/${oldName}>`, 'g')
  return pageJsx.replace(wrappingRe, newJsx)
}
