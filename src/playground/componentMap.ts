/**
 * componentMap — single source of truth for all ReactBits components
 * available in the generation pipeline.
 *
 * All component lists, validation, category lookups, and section mappings
 * derive from APPROVED_COMPONENTS. Never hardcode component names elsewhere.
 */

// ── Single source of truth ────────────────────────────────────────────────────

export const APPROVED_COMPONENTS = {
  backgrounds: [
    'Particles',
    'Aurora',
    'Waves',
    'DotGrid',
    'LiquidChrome',
    'Hyperspeed',
    'Threads',
  ],
  text: [
    'GradientText',
    'ShinyText',
    'BlurIn',
    'RotatingText',
    'TextType',
    'LetterSwap',
    'SplitText',
  ],
  cards: [
    'SpotlightCard',
    'MagicBento',
    'TiltCard',
    'BounceCards',
    'GlassCard',
  ],
  animations: [
    'CountUp',
    'FadeContent',
    'ScrollReveal',
    'MagneticButton',
    'ClickSpark',
  ],
  supporters: [
    'LogoLoop',
    'GlowingBorder',
    'AnimatedBorderTrail',
    'CurvedLoop',
    'CircularGallery',
  ],
} as const

export type ApprovedCategory = keyof typeof APPROVED_COMPONENTS

/** Flat list of all approved component names */
export const ALL_APPROVED: string[] = Object.values(APPROVED_COMPONENTS).flat() as string[]

/** O(1) membership check */
export const VALID_COMPONENT_NAMES = new Set<string>(ALL_APPROVED)

/** Background components — rendered at root level, never inside GPT JSX */
export const BACKGROUND_COMPONENTS = new Set<string>(APPROVED_COMPONENTS.backgrounds as unknown as string[])

// ── Lookups ───────────────────────────────────────────────────────────────────

/** Return the category key for a component name, or null if unknown */
export function getCategory(name: string): ApprovedCategory | null {
  for (const cat of Object.keys(APPROVED_COMPONENTS) as ApprovedCategory[]) {
    if ((APPROVED_COMPONENTS[cat] as readonly string[]).includes(name)) return cat
  }
  return null
}

/**
 * Return which sidebar section a component belongs to:
 *   backgrounds + text → 'hero'
 *   cards + animations + supporters → 'showcase'
 */
export function getSection(name: string): 'hero' | 'showcase' | null {
  const cat = getCategory(name)
  if (!cat) return null
  return cat === 'backgrounds' || cat === 'text' ? 'hero' : 'showcase'
}

// ── Backward-compat shim ──────────────────────────────────────────────────────
// Code that still imports COMPONENT_MAP (e.g. export helper) continues to work.
// registryKey is derived via camelCase→kebab-case conversion so REGISTRY_MAP
// lookups by existing callers keep functioning.

function toKebabCase(name: string): string {
  return name.replace(/([A-Z])/g, (c, _match, i) => (i > 0 ? '-' : '') + c.toLowerCase())
}

export interface ComponentMapEntry {
  registryKey: string
  section: 'hero' | 'showcase'
}

export const COMPONENT_MAP: Record<string, ComponentMapEntry> = Object.fromEntries(
  ALL_APPROVED.map((name) => [
    name,
    {
      registryKey: toKebabCase(name),
      section: (
        (APPROVED_COMPONENTS.backgrounds as readonly string[]).includes(name) ||
        (APPROVED_COMPONENTS.text as readonly string[]).includes(name)
      ) ? 'hero' : 'showcase',
    },
  ])
)

// ── Parser ────────────────────────────────────────────────────────────────────

/**
 * Parse PascalCase component names from a raw JSX string.
 * Background components are excluded — they are handled at the renderer root.
 */
export function parseUsedComponents(jsx: string): string[] {
  const matches = jsx.match(/<([A-Z][a-zA-Z]+)/g) ?? []
  return [
    ...new Set(
      matches
        .map((m) => m.slice(1))
        .filter((n) => VALID_COMPONENT_NAMES.has(n) && !BACKGROUND_COMPONENTS.has(n))
    ),
  ]
}
