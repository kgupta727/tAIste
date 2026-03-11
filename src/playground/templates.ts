/**
 * Built-in starting templates for the Get Inspired playground.
 * Each template is a curated set of canvas items that represent a
 * common page/section composition.
 */

import type { CanvasItem } from '@/src/stores/playgroundStore'

export interface PlaygroundTemplate {
  id: string
  name: string
  description: string
  tags: string[]
  items: Omit<CanvasItem, 'order'>[]
}

export const TEMPLATES: PlaygroundTemplate[] = [
  {
    id: 'saas-launch',
    name: 'SaaS Launch',
    description: 'Hero section with animated background, headline, and social proof',
    tags: ['saas', 'startup', 'launch'],
    items: [
      {
        id: 'tpl-sl-1',
        componentKey: 'aurora',
        layoutHint: 'full',
        props: {
          colorStops: '#5227FF,#00D4FF,#5227FF',
          amplitude: 1.2,
          speed: 0.5,
          blend: 0.5,
        },
      },
      {
        id: 'tpl-sl-2',
        componentKey: 'gradient-text',
        layoutHint: 'full',
        props: {
          text: 'Build. Ship. Grow.',
          from: '#B17BFF',
          to: '#5227FF',
        },
      },
      {
        id: 'tpl-sl-3',
        componentKey: 'animated-list',
        layoutHint: 'full',
        props: { delay: 1000 },
      },
      {
        id: 'tpl-sl-4',
        componentKey: 'logo-loop',
        layoutHint: 'full',
        props: { speed: 50, direction: 'left' },
      },
    ],
  },
  {
    id: 'portfolio',
    name: 'Portfolio',
    description: 'Creative portfolio with 3D effects, tilted cards, and bold type',
    tags: ['portfolio', 'creative', 'designer'],
    items: [
      {
        id: 'tpl-pf-1',
        componentKey: 'threads',
        layoutHint: 'full',
        props: { color: '#ffffff', amplitude: 1 },
      },
      {
        id: 'tpl-pf-2',
        componentKey: 'split-text',
        layoutHint: 'full',
        props: { text: 'Creative Portfolio', delay: 100, duration: 0.6 },
      },
      {
        id: 'tpl-pf-3',
        componentKey: 'tilted-card',
        layoutHint: 'half',
        props: { rotateAmplitude: 12, scaleOnHover: 1.05, displayOverlayContent: true },
      },
      {
        id: 'tpl-pf-4',
        componentKey: 'circular-gallery',
        layoutHint: 'full',
        props: { bend: 3 },
      },
    ],
  },
  {
    id: 'agency',
    name: 'Agency',
    description: 'Bold editorial layout for a creative or marketing agency',
    tags: ['agency', 'marketing', 'bold'],
    items: [
      {
        id: 'tpl-ag-1',
        componentKey: 'dark-veil',
        layoutHint: 'full',
        props: { warpAmount: 1, speed: 0.3 },
      },
      {
        id: 'tpl-ag-2',
        componentKey: 'scroll-reveal',
        layoutHint: 'full',
        props: {
          text: 'We craft experiences that move people and grow brands.',
          threshold: 0.1,
        },
      },
      {
        id: 'tpl-ag-3',
        componentKey: 'flowing-menu',
        layoutHint: 'full',
        props: { marqueeBgColor: '#5227FF', marqueeTextColor: '#ffffff' },
      },
      {
        id: 'tpl-ag-4',
        componentKey: 'magic-bento',
        layoutHint: 'full',
        props: { textColor: '#fff', borderColor: '#333', glowColor: '#5227FF' },
      },
    ],
  },
  {
    id: 'stats-dashboard',
    name: 'Stats Dashboard',
    description: 'Data-forward sections with animated counters and charts',
    tags: ['saas', 'dashboard', 'data', 'stats'],
    items: [
      {
        id: 'tpl-sd-1',
        componentKey: 'squares',
        layoutHint: 'full',
        props: { borderColor: '#333', squareSize: 40, speed: 0.5, direction: 'diagonal' },
      },
      {
        id: 'tpl-sd-2',
        componentKey: 'count-up',
        layoutHint: 'half',
        props: { from: 0, to: 10000, duration: 2000 },
      },
      {
        id: 'tpl-sd-3',
        componentKey: 'counter',
        layoutHint: 'half',
        props: { value: 9999, fontSize: 80 },
      },
      {
        id: 'tpl-sd-4',
        componentKey: 'animated-list',
        layoutHint: 'full',
        props: { delay: 800 },
      },
    ],
  },
  {
    id: 'personal-blog',
    name: 'Personal / Blog',
    description: 'Minimal clean layout for personal websites and blogs',
    tags: ['personal', 'blog', 'minimal', 'writing'],
    items: [
      {
        id: 'tpl-pb-1',
        componentKey: 'particles',
        layoutHint: 'full',
        props: { color: '#ffffff', quantity: 60, size: 1, speed: 0.3 },
      },
      {
        id: 'tpl-pb-2',
        componentKey: 'blur-text',
        layoutHint: 'full',
        props: { text: 'Writing about things that matter', delay: 200, animateBy: 'words' },
      },
      {
        id: 'tpl-pb-3',
        componentKey: 'scroll-reveal',
        layoutHint: 'full',
        props: {
          text: 'Ideas worth sharing. Stories worth reading. Perspectives worth considering.',
          threshold: 0.15,
        },
      },
      {
        id: 'tpl-pb-4',
        componentKey: 'profile-card',
        layoutHint: 'half',
        props: { name: 'Your Name', title: 'Writer & Thinker', avatarUrl: '' },
      },
    ],
  },
]
