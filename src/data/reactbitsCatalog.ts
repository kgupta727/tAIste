export type ReactBitsComponent = {
  id: string
  name: string
  reactbitsUrl: string
  category: 'hero' | 'card' | 'button' | 'nav' | 'text' | 'background' | 'list' | 'testimonial' | 'cta' | 'misc'
  tags: string[]
  tone: string[]
  bestFor: string[]
  avoid: string[]
  installed: boolean
  description: string
}

// ── Catalog ───────────────────────────────────────────────────────────────────
// installed: true  → renders as a live component on the canvas
// installed: false → shows a "copy install command" card (not yet built locally)
//
// To add more: drop in your JSON catalog file and replace this array.
// Each entry with installed:true must also be registered in COMPONENT_MAP
// (src/components/playground/ComponentNode.jsx)

export const REACTBITS_CATALOG: ReactBitsComponent[] = [
  {
    id: 'aurora',
    name: 'Aurora',
    reactbitsUrl: 'https://reactbits.dev/backgrounds/aurora',
    category: 'background',
    tags: ['gradient', 'animated', 'dark', 'premium', 'glow'],
    tone: ['editorial', 'confident', 'premium'],
    bestFor: ['SaaS', 'portfolios', 'hero sections'],
    avoid: ['corporate', 'minimal brands', 'high-information density pages'],
    installed: true,
    description: 'Animated aurora gradient mesh that pulses with shifting colors.',
  },
  {
    id: 'particles',
    name: 'Particles',
    reactbitsUrl: 'https://reactbits.dev/backgrounds/particles',
    category: 'background',
    tags: ['particles', 'animated', 'dark', 'tech', 'interactive'],
    tone: ['confident', 'technical', 'editorial'],
    bestFor: ['dev tools', 'SaaS', 'portfolios'],
    avoid: ['consumer apps', 'warm brands', 'editorial content'],
    installed: true,
    description: 'Floating interactive particle field with mouse-repel physics.',
  },
  {
    id: 'split-text',
    name: 'Split Text',
    reactbitsUrl: 'https://reactbits.dev/text-animations/split-text',
    category: 'text',
    tags: ['animated', 'typography', 'entrance', 'minimal', 'premium'],
    tone: ['editorial', 'confident', 'premium'],
    bestFor: ['hero headlines', 'portfolios', 'landing pages'],
    avoid: ['body copy', 'data-heavy UIs', 'corporate dashboards'],
    installed: true,
    description: 'Letters split apart and animate in with staggered spring physics.',
  },
  {
    id: 'magnet',
    name: 'Magnet Button',
    reactbitsUrl: 'https://reactbits.dev/animations/magnet',
    category: 'button',
    tags: ['interactive', 'magnetic', 'cursor', 'premium', 'playful'],
    tone: ['playful', 'confident', 'premium'],
    bestFor: ['CTAs', 'portfolios', 'consumer apps'],
    avoid: ['forms', 'dense UIs', 'mobile-primary products'],
    installed: true,
    description: 'Button that magnetically pulls toward the cursor on hover.',
  },
  {
    id: 'spotlight-card',
    name: 'Spotlight Card',
    reactbitsUrl: 'https://reactbits.dev/components/spotlight-card',
    category: 'card',
    tags: ['glassmorphism', 'dark', 'interactive', 'premium', 'glow'],
    tone: ['premium', 'editorial', 'confident'],
    bestFor: ['feature cards', 'SaaS', 'portfolios', 'dev tools'],
    avoid: ['light themes', 'minimal brands', 'content-heavy layouts'],
    installed: true,
    description: 'Dark card with a radial spotlight that follows the cursor.',
  },
  {
    id: 'gradient-text',
    name: 'Gradient Text',
    reactbitsUrl: 'https://reactbits.dev/text-animations/gradient-text',
    category: 'text',
    tags: ['gradient', 'animated', 'typography', 'premium', 'colorful'],
    tone: ['editorial', 'confident', 'playful'],
    bestFor: ['headlines', 'hero sections', 'landing pages'],
    avoid: ['body copy', 'dark-only brands', 'corporate'],
    installed: true,
    description: 'Text with an animated shifting gradient fill.',
  },
  {
    id: 'noise',
    name: 'Noise Background',
    reactbitsUrl: 'https://reactbits.dev/backgrounds/noise',
    category: 'background',
    tags: ['texture', 'noise', 'minimal', 'dark', 'brutalist'],
    tone: ['editorial', 'premium', 'confident'],
    bestFor: ['portfolios', 'editorial', 'art direction'],
    avoid: ['corporate', 'consumer apps', 'data dashboards'],
    installed: true,
    description: 'Subtle film-grain noise texture overlay that adds depth to backgrounds.',
  },
  {
    id: 'blinking-cursor',
    name: 'Blinking Cursor',
    reactbitsUrl: 'https://reactbits.dev/text-animations/blinking-cursor',
    category: 'text',
    tags: ['typewriter', 'animated', 'minimal', 'tech', 'terminal'],
    tone: ['technical', 'editorial', 'playful'],
    bestFor: ['dev tools', 'portfolios', 'hero headlines'],
    avoid: ['consumer apps', 'corporate', 'content-heavy pages'],
    installed: true,
    description: 'Typewriter text animation with an authentic blinking cursor.',
  },
  {
    id: 'letter-swap',
    name: 'Letter Swap',
    reactbitsUrl: 'https://reactbits.dev/text-animations/letter-swap',
    category: 'text',
    tags: ['interactive', 'typography', 'hover', 'playful', 'animated'],
    tone: ['playful', 'editorial', 'confident'],
    bestFor: ['nav items', 'buttons', 'hero text', 'portfolios'],
    avoid: ['body copy', 'corporate', 'mobile-primary'],
    installed: true,
    description: 'Characters swap to random glyphs then resolve back on hover.',
  },
  {
    id: 'pixel-trail',
    name: 'Pixel Trail',
    reactbitsUrl: 'https://reactbits.dev/animations/pixel-trail',
    category: 'misc',
    tags: ['cursor', 'interactive', 'playful', 'colorful', 'animated'],
    tone: ['playful', 'editorial', 'warm'],
    bestFor: ['portfolios', 'consumer apps', 'interactive experiences'],
    avoid: ['SaaS dashboards', 'corporate', 'minimal brands'],
    installed: true,
    description: 'Colored pixel squares trail behind the mouse cursor.',
  },
]
