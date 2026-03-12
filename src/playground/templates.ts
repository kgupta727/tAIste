/**
 * Position-based templates for the Get Inspired playground.
 *
 * Each template describes a set of SECTIONS and SLOTS — not specific
 * components. The AI fills each slot with the best component for the brand.
 *
 * SlotPosition values are CSS strings used as inline `position: absolute`
 * values in the generated preview and exported code.
 */

import type { SlotType, SlotPosition, CanvasSection, CanvasItem } from '@/src/stores/playgroundStore'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TemplateSlot {
  id: string
  slotType: SlotType
  label: string
  position: SlotPosition
  /** Preferred componentKeys going to AI — just hints, AI can ignore */
  componentHints: string[]
  /** Placeholder when slot has no component assigned yet */
  emptyLabel: string
}

export interface TemplateSection {
  id: string
  label: string
  heightVh: number
  slots: TemplateSlot[]
}

export interface PositionTemplate {
  id: string
  name: string
  description: string
  pageType: string
  tags: string[]
  /** Short wireframe description shown in picker */
  wireframeHint: string
  sections: TemplateSection[]
}

// ── Shared slot position helpers ──────────────────────────────────────────────

const BG_POS: SlotPosition = { top: '0', left: '0', width: '100%' }

// ── Templates ─────────────────────────────────────────────────────────────────
//
// Rules:
//   1. ONE background slot per page — only the hero (s1) gets a background slot.
//   2. Each template has EXACTLY 2 sections:
//        Section 1 — Hero (100vh): bg + hero-headline + hero-sub + hero-accent
//        Section 2 — Showcase (85vh): ONE strong centerpiece (card-grid or gallery)
//   3. hero-accent renders inline below CTA buttons in the hero content column.
//   4. componentHints use ONLY confirmed registry keys.

export const POSITION_TEMPLATES: PositionTemplate[] = [
  // ─── 1. Portfolio ──────────────────────────────────────────────────────────
  {
    id: 'portfolio',
    name: 'Portfolio',
    description: 'Bold creative portfolio for designers & developers — animated threads, work gallery, tilt cards.',
    pageType: 'portfolio',
    tags: ['portfolio', 'creative', 'designer', 'developer'],
    wireframeHint: 'Full-screen animated hero · work gallery showcase',
    sections: [
      {
        id: 'pf-s1',
        label: 'Hero',
        heightVh: 100,
        slots: [
          {
            id: 'pf-s1-bg',
            slotType: 'background',
            label: 'Background',
            position: BG_POS,
            componentHints: ['threads', 'silk', 'iridescence'],
            emptyLabel: 'Add a background',
          },
          {
            id: 'pf-s1-headline',
            slotType: 'hero-headline',
            label: 'Your Name',
            position: { top: '42%', left: '50%', transform: 'translateX(-50%)', width: '75%', textAlign: 'center' },
            componentHints: ['split-text', 'blur-text'],
            emptyLabel: 'Add your name',
          },
          {
            id: 'pf-s1-sub',
            slotType: 'hero-sub',
            label: 'Role / Discipline',
            position: { top: '58%', left: '50%', transform: 'translateX(-50%)', width: '55%', textAlign: 'center' },
            componentHints: ['rotating-text', 'shiny-text'],
            emptyLabel: 'Add your role',
          },
          {
            id: 'pf-s1-accent',
            slotType: 'hero-accent',
            label: 'Client Logos',
            position: { bottom: '12%', left: '0', width: '100%' },
            componentHints: ['logo-loop', 'scroll-float'],
            emptyLabel: 'Add logo strip or accent',
          },
        ],
      },
      {
        id: 'pf-s2',
        label: 'Selected Work',
        heightVh: 85,
        slots: [
          {
            id: 'pf-s2-gallery',
            slotType: 'gallery',
            label: 'Work Gallery',
            position: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '92%' },
            componentHints: ['tilted-card', 'circular-gallery', 'bounce-cards', 'card-swap'],
            emptyLabel: 'Add work gallery',
          },
        ],
      },
    ],
  },

  // ─── 2. SaaS Landing ──────────────────────────────────────────────────────
  {
    id: 'saas-landing',
    name: 'SaaS Landing',
    description: 'High-conversion SaaS page — aurora backdrop, centered gradient headline, spotlight feature cards.',
    pageType: 'saas',
    tags: ['saas', 'startup', 'product', 'launch'],
    wireframeHint: 'Animated hero with logo strip · spotlight feature cards',
    sections: [
      {
        id: 'saas-s1',
        label: 'Hero',
        heightVh: 100,
        slots: [
          {
            id: 'saas-s1-bg',
            slotType: 'background',
            label: 'Background',
            position: BG_POS,
            componentHints: ['aurora', 'beams', 'galaxy'],
            emptyLabel: 'Add a background',
          },
          {
            id: 'saas-s1-headline',
            slotType: 'hero-headline',
            label: 'Product Headline',
            position: { top: '40%', left: '50%', transform: 'translateX(-50%)', width: '80%', textAlign: 'center' },
            componentHints: ['gradient-text'],
            emptyLabel: 'Add headline',
          },
          {
            id: 'saas-s1-sub',
            slotType: 'hero-sub',
            label: 'Tagline',
            position: { top: '56%', left: '50%', transform: 'translateX(-50%)', width: '60%', textAlign: 'center' },
            componentHints: ['text-type', 'scrambled-text'],
            emptyLabel: 'Add tagline',
          },
          {
            id: 'saas-s1-accent',
            slotType: 'hero-accent',
            label: 'Trusted By',
            position: { bottom: '8%', left: '0', width: '100%' },
            componentHints: ['logo-loop'],
            emptyLabel: 'Add logo strip',
          },
        ],
      },
      {
        id: 'saas-s2',
        label: 'Features',
        heightVh: 85,
        slots: [
          {
            id: 'saas-s2-cards',
            slotType: 'card-grid',
            label: 'Feature Cards',
            position: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '90%' },
            componentHints: ['spotlight-card', 'magic-bento', 'animated-list'],
            emptyLabel: 'Add feature cards',
          },
        ],
      },
    ],
  },

  // ─── 3. Agency ────────────────────────────────────────────────────────────
  {
    id: 'agency',
    name: 'Creative Agency',
    description: 'Editorial agency — dark-veil atmosphere, bold headline, bento case studies.',
    pageType: 'agency',
    tags: ['agency', 'creative', 'marketing', 'bold', 'editorial'],
    wireframeHint: 'Bold statement hero · bento case study showcase',
    sections: [
      {
        id: 'ag-s1',
        label: 'Statement',
        heightVh: 100,
        slots: [
          {
            id: 'ag-s1-bg',
            slotType: 'background',
            label: 'Background',
            position: BG_POS,
            componentHints: ['dark-veil', 'light-rays', 'plasma'],
            emptyLabel: 'Add a background',
          },
          {
            id: 'ag-s1-headline',
            slotType: 'hero-headline',
            label: 'Agency Statement',
            position: { top: '40%', left: '50%', transform: 'translateX(-50%)', width: '80%', textAlign: 'center' },
            componentHints: ['scroll-reveal', 'split-text'],
            emptyLabel: 'Add agency statement',
          },
          {
            id: 'ag-s1-sub',
            slotType: 'hero-sub',
            label: 'What You Do',
            position: { top: '58%', left: '50%', transform: 'translateX(-50%)', width: '55%', textAlign: 'center' },
            componentHints: ['shiny-text', 'gradient-text'],
            emptyLabel: 'Add descriptor',
          },
          {
            id: 'ag-s1-accent',
            slotType: 'hero-accent',
            label: 'Client Logos',
            position: { bottom: '8%', left: '0', width: '100%' },
            componentHints: ['logo-loop', 'elastic-line'],
            emptyLabel: 'Add accent',
          },
        ],
      },
      {
        id: 'ag-s2',
        label: 'Our Work',
        heightVh: 85,
        slots: [
          {
            id: 'ag-s2-grid',
            slotType: 'card-grid',
            label: 'Case Studies',
            position: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '92%' },
            componentHints: ['magic-bento', 'chroma-grid', 'spotlight-card'],
            emptyLabel: 'Add case study grid',
          },
        ],
      },
    ],
  },

  // ─── 4. Personal / Blog ───────────────────────────────────────────────────
  {
    id: 'personal-blog',
    name: 'Personal & Blog',
    description: 'Warm personal site or blog — particle field, blur-text intro, animated post list.',
    pageType: 'personal',
    tags: ['personal', 'blog', 'minimal', 'writing', 'clean'],
    wireframeHint: 'Atmospheric hero with bio · writing showcase list',
    sections: [
      {
        id: 'pb-s1',
        label: 'Hello',
        heightVh: 100,
        slots: [
          {
            id: 'pb-s1-bg',
            slotType: 'background',
            label: 'Background',
            position: BG_POS,
            componentHints: ['particles', 'dither', 'pixel-snow'],
            emptyLabel: 'Add a background',
          },
          {
            id: 'pb-s1-name',
            slotType: 'hero-headline',
            label: 'Your Name',
            position: { top: '40%', left: '50%', transform: 'translateX(-50%)', width: '70%', textAlign: 'center' },
            componentHints: ['blur-text', 'split-text'],
            emptyLabel: 'Add your name',
          },
          {
            id: 'pb-s1-bio',
            slotType: 'hero-sub',
            label: 'One-liner Bio',
            position: { top: '57%', left: '50%', transform: 'translateX(-50%)', width: '55%', textAlign: 'center' },
            componentHints: ['text-type', 'scrambled-text'],
            emptyLabel: 'Add your bio',
          },
          {
            id: 'pb-s1-accent',
            slotType: 'hero-accent',
            label: 'Social / Badge',
            position: { bottom: '12%', left: '50%', transform: 'translateX(-50%)', width: '40%' },
            componentHints: ['scroll-float', 'elastic-line', 'logo-loop'],
            emptyLabel: 'Add accent badge',
          },
        ],
      },
      {
        id: 'pb-s2',
        label: 'Writing',
        heightVh: 85,
        slots: [
          {
            id: 'pb-s2-posts',
            slotType: 'card-grid',
            label: 'Recent Posts',
            position: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '85%' },
            componentHints: ['animated-list', 'spotlight-card', 'stack'],
            emptyLabel: 'Add posts',
          },
        ],
      },
    ],
  },

  // ─── 5. Startup ───────────────────────────────────────────────────────────
  {
    id: 'startup',
    name: 'Startup',
    description: 'High-energy launch page — hyperspeed tunnel, rotating mission headline, bounce feature cards.',
    pageType: 'startup',
    tags: ['startup', 'launch', 'energy', 'bold', 'growth'],
    wireframeHint: 'High-energy hero with investor strip · feature cards showcase',
    sections: [
      {
        id: 'st-s1',
        label: 'Launch',
        heightVh: 100,
        slots: [
          {
            id: 'st-s1-bg',
            slotType: 'background',
            label: 'Background',
            position: BG_POS,
            componentHints: ['hyperspeed', 'orb', 'lightning'],
            emptyLabel: 'Add a background',
          },
          {
            id: 'st-s1-headline',
            slotType: 'hero-headline',
            label: 'Mission Statement',
            position: { top: '38%', left: '50%', transform: 'translateX(-50%)', width: '85%', textAlign: 'center' },
            componentHints: ['rotating-text', 'gradient-text'],
            emptyLabel: 'Add mission headline',
          },
          {
            id: 'st-s1-sub',
            slotType: 'hero-sub',
            label: 'Value Prop',
            position: { top: '56%', left: '50%', transform: 'translateX(-50%)', width: '65%', textAlign: 'center' },
            componentHints: ['shiny-text', 'text-type'],
            emptyLabel: 'Add value prop',
          },
          {
            id: 'st-s1-accent',
            slotType: 'hero-accent',
            label: 'Backed By',
            position: { bottom: '8%', left: '0', width: '100%' },
            componentHints: ['logo-loop'],
            emptyLabel: 'Add investor logos',
          },
        ],
      },
      {
        id: 'st-s2',
        label: "What We're Building",
        heightVh: 85,
        slots: [
          {
            id: 'st-s2-features',
            slotType: 'card-grid',
            label: 'Feature Cards',
            position: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '92%' },
            componentHints: ['bounce-cards', 'spotlight-card', 'magic-bento'],
            emptyLabel: 'Add feature cards',
          },
        ],
      },
    ],
  },

  // ─── 6. Creative Studio ───────────────────────────────────────────────────
  {
    id: 'creative-studio',
    name: 'Creative Studio',
    description: 'Luxury creative studio — liquid-chrome immersion, shiny studio name, circular gallery showcase.',
    pageType: 'studio',
    tags: ['studio', 'art', 'design', 'creative', 'luxury'],
    wireframeHint: 'Luxury immersive hero · circular gallery portfolio',
    sections: [
      {
        id: 'cs-s1',
        label: 'Presence',
        heightVh: 100,
        slots: [
          {
            id: 'cs-s1-bg',
            slotType: 'background',
            label: 'Background',
            position: BG_POS,
            componentHints: ['liquid-chrome', 'iridescence', 'plasma'],
            emptyLabel: 'Add a background',
          },
          {
            id: 'cs-s1-headline',
            slotType: 'hero-headline',
            label: 'Studio Name',
            position: { top: '40%', left: '50%', transform: 'translateX(-50%)', width: '70%', textAlign: 'center' },
            componentHints: ['shiny-text', 'split-text'],
            emptyLabel: 'Add studio name',
          },
          {
            id: 'cs-s1-sub',
            slotType: 'hero-sub',
            label: 'Discipline',
            position: { top: '57%', left: '50%', transform: 'translateX(-50%)', width: '50%', textAlign: 'center' },
            componentHints: ['gradient-text', 'fade-content'],
            emptyLabel: 'Add discipline',
          },
          {
            id: 'cs-s1-accent',
            slotType: 'hero-accent',
            label: 'Awards / Recognition',
            position: { bottom: '10%', left: '50%', transform: 'translateX(-50%)', width: '70%' },
            componentHints: ['logo-loop', 'elastic-line'],
            emptyLabel: 'Add recognition strip',
          },
        ],
      },
      {
        id: 'cs-s2',
        label: 'Portfolio',
        heightVh: 85,
        slots: [
          {
            id: 'cs-s2-gallery',
            slotType: 'gallery',
            label: 'Portfolio Gallery',
            position: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%' },
            componentHints: ['circular-gallery', 'tilted-card', 'card-swap', 'scroll-stack'],
            emptyLabel: 'Add gallery',
          },
        ],
      },
    ],
  },

  // ─── 7. Dark Tech / Dev Tool ──────────────────────────────────────────────
  {
    id: 'dark-tech',
    name: 'Dark Tech',
    description: 'Developer tool — letter-glitch atmosphere, decrypted product name, spotlight feature grid.',
    pageType: 'tech',
    tags: ['developer', 'tool', 'tech', 'dark', 'minimal', 'saas'],
    wireframeHint: 'Atmospheric hero · spotlight capability cards',
    sections: [
      {
        id: 'dt-s1',
        label: 'Product',
        heightVh: 100,
        slots: [
          {
            id: 'dt-s1-bg',
            slotType: 'background',
            label: 'Background',
            position: BG_POS,
            componentHints: ['letter-glitch', 'grid-motion', 'beams'],
            emptyLabel: 'Add a background',
          },
          {
            id: 'dt-s1-headline',
            slotType: 'hero-headline',
            label: 'Product Name',
            position: { top: '40%', left: '50%', transform: 'translateX(-50%)', width: '75%', textAlign: 'center' },
            componentHints: ['decrypted-text', 'split-text'],
            emptyLabel: 'Add product name',
          },
          {
            id: 'dt-s1-sub',
            slotType: 'hero-sub',
            label: 'One-liner',
            position: { top: '57%', left: '50%', transform: 'translateX(-50%)', width: '60%', textAlign: 'center' },
            componentHints: ['text-type', 'scrambled-text'],
            emptyLabel: 'Add description',
          },
          {
            id: 'dt-s1-accent',
            slotType: 'hero-accent',
            label: 'Integrations',
            position: { bottom: '8%', left: '0', width: '100%' },
            componentHints: ['logo-loop', 'elastic-line'],
            emptyLabel: 'Add integration logos',
          },
        ],
      },
      {
        id: 'dt-s2',
        label: 'Capabilities',
        heightVh: 85,
        slots: [
          {
            id: 'dt-s2-cards',
            slotType: 'card-grid',
            label: 'Feature Cards',
            position: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '88%' },
            componentHints: ['spotlight-card', 'glass-icons', 'animated-list'],
            emptyLabel: 'Add capability cards',
          },
        ],
      },
    ],
  },

  // ─── 8. Minimal ───────────────────────────────────────────────────────────
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Pure typography-led design — waves atmosphere, text-type headline, glass surface content.',
    pageType: 'minimal',
    tags: ['minimal', 'clean', 'typography', 'elegant', 'whitespace'],
    wireframeHint: 'Clean typography hero · curated content showcase',
    sections: [
      {
        id: 'mn-s1',
        label: 'Message',
        heightVh: 100,
        slots: [
          {
            id: 'mn-s1-bg',
            slotType: 'background',
            label: 'Background',
            position: BG_POS,
            componentHints: ['waves', 'dither', 'dot-grid'],
            emptyLabel: 'Add a subtle background',
          },
          {
            id: 'mn-s1-headline',
            slotType: 'hero-headline',
            label: 'Main Message',
            position: { top: '40%', left: '50%', transform: 'translateX(-50%)', width: '75%', textAlign: 'center' },
            componentHints: ['text-type', 'blur-text'],
            emptyLabel: 'Add main message',
          },
          {
            id: 'mn-s1-sub',
            slotType: 'hero-sub',
            label: 'Supporting Line',
            position: { top: '57%', left: '50%', transform: 'translateX(-50%)', width: '55%', textAlign: 'center' },
            componentHints: ['fade-content', 'scroll-reveal'],
            emptyLabel: 'Add supporting text',
          },
          {
            id: 'mn-s1-accent',
            slotType: 'hero-accent',
            label: 'Subtle Accent',
            position: { bottom: '10%', left: '50%', transform: 'translateX(-50%)', width: '40%' },
            componentHints: ['elastic-line', 'scroll-float', 'logo-loop'],
            emptyLabel: 'Add subtle accent',
          },
        ],
      },
      {
        id: 'mn-s2',
        label: 'Work',
        heightVh: 85,
        slots: [
          {
            id: 'mn-s2-content',
            slotType: 'card-grid',
            label: 'Content',
            position: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '78%' },
            componentHints: ['glass-surface', 'spotlight-card', 'stack'],
            emptyLabel: 'Add content',
          },
        ],
      },
    ],
  },
]

// ── Lookup map ────────────────────────────────────────────────────────────────

export const TEMPLATE_MAP: Record<string, PositionTemplate> = Object.fromEntries(
  POSITION_TEMPLATES.map((t) => [t.id, t])
)

// ── Scaffold a canvas state from a template (empty slots) ─────────────────────

export function scaffoldTemplate(
  template: PositionTemplate
): { sections: CanvasSection[]; items: CanvasItem[] } {
  const sections: CanvasSection[] = []
  const items: CanvasItem[] = []
  let globalOrder = 0

  for (let si = 0; si < template.sections.length; si++) {
    const sec = template.sections[si]
    const sectionId = sec.id

    sections.push({
      id: sectionId,
      templateSlotId: sec.id,
      label: sec.label,
      heightVh: sec.heightVh,
      order: si,
    })

    for (const slot of sec.slots) {
      items.push({
        id: slot.id,               // use template slot ID so AI fill can match by slotId
        componentKey: '',          // empty — AI fills this
        props: {},
        order: globalOrder++,
        layoutHint: 'full',
        sectionId,
        slotType: slot.slotType,
        slotPosition: slot.position,
        visible: true,
      })
    }
  }

  return { sections, items }
}
