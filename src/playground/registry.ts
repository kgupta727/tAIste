// Registry of all ReactBits components available in the playground.
// Each entry defines the component's metadata, configurable props (propSchema),
// and how to map Brand DNA fields to those props (brandDNAMapping).

export type PropType = 'color' | 'string' | 'number' | 'boolean' | 'enum'

export interface PropSchema {
  key: string
  label: string
  type: PropType
  default: string | number | boolean
  options?: string[]        // for enum
  min?: number              // for number
  max?: number              // for number
  step?: number             // for number
  featured?: boolean        // show in collapsed props view
}

export interface ComponentEntry {
  key: string               // kebab-case, matches ReactBits registry name
  name: string              // display name
  category: 'Backgrounds' | 'Components' | 'TextAnimations' | 'Animations'
  description: string
  tags: string[]            // mood/style tags for AI matching
  propSchema: PropSchema[]
  // Maps brand DNA fields to prop keys.
  // Supported sources: primary[0-2], accent[0-1], neutral[0-1], archetype, tagline,
  //                    toneVoice, whitespace (generous→airy, tight→dense)
  brandDNAMapping?: Partial<Record<
    'primaryColor' | 'accentColor' | 'neutralColor' | 'tagline',
    string
  >>
  // Sandpack registry variant to fetch: defaults to TS-TW
  variant?: 'JS-CSS' | 'JS-TW' | 'TS-CSS' | 'TS-TW'
}

export const REGISTRY: ComponentEntry[] = [
  // ─── BACKGROUNDS ─────────────────────────────────────────────────────────
  {
    key: 'aurora',
    name: 'Aurora',
    category: 'Backgrounds',
    description: 'Animated aurora borealis gradient background',
    tags: ['premium', 'dark', 'modern', 'luxury', 'bold'],
    brandDNAMapping: { primaryColor: 'colorStops', accentColor: 'colorStops' },
    propSchema: [
      { key: 'colorStops', label: 'Colors', type: 'string', default: '#5227FF,#00D4FF,#5227FF', featured: true },
      { key: 'amplitude', label: 'Amplitude', type: 'number', default: 1, min: 0, max: 3, step: 0.1, featured: true },
      { key: 'blend', label: 'Blend', type: 'number', default: 0.5, min: 0, max: 1, step: 0.05 },
      { key: 'speed', label: 'Speed', type: 'number', default: 0.5, min: 0, max: 2, step: 0.1 },
    ],
  },
  {
    key: 'silk',
    name: 'Silk',
    category: 'Backgrounds',
    description: 'Smooth flowing silk cloth simulation',
    tags: ['luxury', 'premium', 'elegant', 'refined', 'minimal'],
    brandDNAMapping: { primaryColor: 'color' },
    propSchema: [
      { key: 'color', label: 'Color', type: 'color', default: '#7B5EA7', featured: true },
      { key: 'speed', label: 'Speed', type: 'number', default: 5, min: 1, max: 20, step: 1, featured: true },
      { key: 'noiseIntensity', label: 'Noise', type: 'number', default: 1.5, min: 0, max: 3, step: 0.1 },
    ],
  },
  {
    key: 'particles',
    name: 'Particles',
    category: 'Backgrounds',
    description: 'Floating particle field background',
    tags: ['technical', 'minimal', 'dark', 'modern', 'developer-tools'],
    brandDNAMapping: { primaryColor: 'color' },
    propSchema: [
      { key: 'color', label: 'Particle Color', type: 'color', default: '#ffffff', featured: true },
      { key: 'quantity', label: 'Count', type: 'number', default: 100, min: 20, max: 500, step: 10, featured: true },
      { key: 'size', label: 'Size', type: 'number', default: 1, min: 0.5, max: 5, step: 0.5 },
      { key: 'speed', label: 'Speed', type: 'number', default: 0.5, min: 0, max: 3, step: 0.1 },
    ],
  },
  {
    key: 'iridescence',
    name: 'Iridescence',
    category: 'Backgrounds',
    description: 'Iridescent oil-slick effect background',
    tags: ['creative', 'bold', 'premium', 'luxury', 'editorial'],
    propSchema: [
      { key: 'speed', label: 'Speed', type: 'number', default: 1, min: 0.1, max: 5, step: 0.1, featured: true },
      { key: 'amplitude', label: 'Intensity', type: 'number', default: 0.1, min: 0, max: 1, step: 0.01, featured: true },
    ],
  },
  {
    key: 'squares',
    name: 'Squares',
    category: 'Backgrounds',
    description: 'Animated grid of glowing squares',
    tags: ['technical', 'grid', 'minimal', 'saas', 'developer-tools'],
    brandDNAMapping: { accentColor: 'borderColor' },
    propSchema: [
      { key: 'borderColor', label: 'Grid Color', type: 'color', default: '#333', featured: true },
      { key: 'squareSize', label: 'Square Size', type: 'number', default: 40, min: 20, max: 120, step: 10, featured: true },
      { key: 'speed', label: 'Speed', type: 'number', default: 0.5, min: 0, max: 2, step: 0.1 },
      { key: 'direction', label: 'Direction', type: 'enum', default: 'diagonal', options: ['diagonal', 'up', 'down', 'left', 'right'] },
    ],
  },
  {
    key: 'waves',
    name: 'Waves',
    category: 'Backgrounds',
    description: 'Flowing wave animation in WebGL',
    tags: ['creative', 'bold', 'playful', 'editorial', 'organic'],
    brandDNAMapping: { primaryColor: 'lineColor' },
    propSchema: [
      { key: 'lineColor', label: 'Wave Color', type: 'color', default: '#5227FF', featured: true },
      { key: 'speed', label: 'Speed', type: 'number', default: 0.5, min: 0, max: 2, step: 0.05, featured: true },
      { key: 'waveAmpX', label: 'Amplitude X', type: 'number', default: 28, min: 5, max: 100, step: 1 },
      { key: 'waveAmpY', label: 'Amplitude Y', type: 'number', default: 8, min: 5, max: 60, step: 1 },
    ],
  },
  {
    key: 'dot-grid',
    name: 'Dot Grid',
    category: 'Backgrounds',
    description: 'Animated dot-grid pattern',
    tags: ['minimal', 'technical', 'saas', 'clean', 'grid'],
    brandDNAMapping: { accentColor: 'dotColor' },
    propSchema: [
      { key: 'dotColor', label: 'Dot Color', type: 'color', default: '#555', featured: true },
      { key: 'dotSize', label: 'Dot Size', type: 'number', default: 2, min: 1, max: 6, step: 0.5, featured: true },
      { key: 'spacing', label: 'Spacing', type: 'number', default: 30, min: 10, max: 80, step: 5 },
    ],
  },
  {
    key: 'beams',
    name: 'Beams',
    category: 'Backgrounds',
    description: 'Light beam sweep animation',
    tags: ['bold', 'dark', 'premium', 'technical', 'saas'],
    brandDNAMapping: { accentColor: 'beamColor' },
    propSchema: [
      { key: 'beamColor', label: 'Beam Color', type: 'color', default: '#5227FF', featured: true },
      { key: 'beamWidth', label: 'Width', type: 'number', default: 2, min: 1, max: 10, step: 0.5, featured: true },
      { key: 'beamHeight', label: 'Height', type: 'number', default: 15, min: 5, max: 40, step: 1 },
    ],
  },
  {
    key: 'grid-motion',
    name: 'Grid Motion',
    category: 'Backgrounds',
    description: 'Scrolling image grid background',
    tags: ['editorial', 'bold', 'creative', 'gallery', 'photography'],
    propSchema: [
      { key: 'speed', label: 'Speed', type: 'number', default: 1, min: 0.1, max: 5, step: 0.1, featured: true },
      { key: 'pauseOnHover', label: 'Pause on Hover', type: 'boolean', default: true, featured: true },
    ],
  },
  {
    key: 'hyperspeed',
    name: 'Hyperspeed',
    category: 'Backgrounds',
    description: 'Star warp / hyperdrive tunnel effect',
    tags: ['bold', 'technical', 'dark', 'futuristic', 'gaming'],
    propSchema: [
      { key: 'preset', label: 'Preset', type: 'enum', default: 'one', options: ['one', 'two', 'three', 'four', 'five', 'six', 'seven'], featured: true },
    ],
  },
  {
    key: 'letter-glitch',
    name: 'Letter Glitch',
    category: 'Backgrounds',
    description: 'Glitching letter matrix background',
    tags: ['dark', 'technical', 'hacker', 'glitch', 'futuristic'],
    brandDNAMapping: { accentColor: 'glitchColors' },
    propSchema: [
      { key: 'glitchColors', label: 'Glitch Colors', type: 'string', default: '#2b4539,#61dca3,#61b3dc', featured: true },
      { key: 'smooth', label: 'Smooth', type: 'boolean', default: true, featured: true },
      { key: 'speed', label: 'Speed', type: 'number', default: 0.2, min: 0.05, max: 1, step: 0.05 },
    ],
  },
  {
    key: 'ballpit',
    name: 'Ballpit',
    category: 'Backgrounds',
    description: 'Playful physics-based bouncing balls',
    tags: ['playful', 'fun', 'creative', 'bold', 'colorful'],
    propSchema: [
      { key: 'count', label: 'Ball Count', type: 'number', default: 200, min: 50, max: 600, step: 50, featured: true },
      { key: 'gravity', label: 'Gravity', type: 'number', default: 0.5, min: 0, max: 3, step: 0.1, featured: true },
    ],
  },
  {
    key: 'orb',
    name: 'Orb',
    category: 'Backgrounds',
    description: 'Floating glowing orb background',
    tags: ['premium', 'minimal', 'dark', 'elegant', 'saas'],
    brandDNAMapping: { accentColor: 'color' },
    propSchema: [
      { key: 'color', label: 'Orb Color', type: 'color', default: '#5227FF', featured: true },
      { key: 'scale', label: 'Scale', type: 'number', default: 1, min: 0.1, max: 3, step: 0.1, featured: true },
      { key: 'dampingFactor', label: 'Damping', type: 'number', default: 0.05, min: 0.01, max: 0.2, step: 0.01 },
    ],
  },
  {
    key: 'dark-veil',
    name: 'Dark Veil',
    category: 'Backgrounds',
    description: 'Dark flowing distortion shader background',
    tags: ['dark', 'luxury', 'premium', 'bold', 'moody'],
    propSchema: [
      { key: 'warpAmount', label: 'Warp', type: 'number', default: 1, min: 0, max: 5, step: 0.1, featured: true },
      { key: 'speed', label: 'Speed', type: 'number', default: 0.3, min: 0, max: 2, step: 0.05, featured: true },
    ],
  },
  {
    key: 'galaxy',
    name: 'Galaxy',
    category: 'Backgrounds',
    description: 'Swirling galaxy particle effect',
    tags: ['dark', 'futuristic', 'premium', 'bold', 'creative'],
    propSchema: [
      { key: 'particleCount', label: 'Particles', type: 'number', default: 5000, min: 1000, max: 15000, step: 500, featured: true },
    ],
  },
  {
    key: 'light-rays',
    name: 'Light Rays',
    category: 'Backgrounds',
    description: 'Cinematic light ray crepuscular effect',
    tags: ['premium', 'editorial', 'luxury', 'photography', 'bold'],
    brandDNAMapping: { accentColor: 'color' },
    propSchema: [
      { key: 'color', label: 'Ray Color', type: 'color', default: '#FFFFFF', featured: true },
      { key: 'rayCount', label: 'Ray Count', type: 'number', default: 10, min: 3, max: 30, step: 1, featured: true },
    ],
  },
  {
    key: 'threads',
    name: 'Threads',
    category: 'Backgrounds',
    description: 'Flowing thread / rope physics simulation',
    tags: ['organic', 'creative', 'playful', 'bold', 'editorial'],
    brandDNAMapping: { primaryColor: 'color' },
    propSchema: [
      { key: 'color', label: 'Thread Color', type: 'color', default: '#ffffff', featured: true },
      { key: 'amplitude', label: 'Amplitude', type: 'number', default: 1, min: 0.1, max: 5, step: 0.1, featured: true },
    ],
  },
  {
    key: 'dither',
    name: 'Dither',
    category: 'Backgrounds',
    description: 'Retro dithered pixel art background',
    tags: ['retro', 'creative', 'minimal', 'technical', 'editorial'],
    propSchema: [
      { key: 'waveSpeed', label: 'Speed', type: 'number', default: 0.05, min: 0, max: 0.5, step: 0.01, featured: true },
      { key: 'colorNum', label: 'Colors', type: 'number', default: 2, min: 2, max: 8, step: 1, featured: true },
      { key: 'pixelSize', label: 'Pixel Size', type: 'number', default: 2, min: 1, max: 8, step: 1 },
    ],
  },
  {
    key: 'grid-distortion',
    name: 'Grid Distortion',
    category: 'Backgrounds',
    description: 'Image grid with cursor distortion effect',
    tags: ['creative', 'editorial', 'interactive', 'bold', 'photography'],
    propSchema: [
      { key: 'grid', label: 'Grid Size', type: 'number', default: 15, min: 5, max: 30, step: 1, featured: true },
      { key: 'mouse', label: 'Mouse Influence', type: 'number', default: 0.1, min: 0, max: 0.5, step: 0.01, featured: true },
      { key: 'strength', label: 'Strength', type: 'number', default: 0.15, min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    key: 'lightning',
    name: 'Lightning',
    category: 'Backgrounds',
    description: 'Electric lightning bolt animation background',
    tags: ['bold', 'dark', 'technical', 'futuristic', 'gaming'],
    brandDNAMapping: { accentColor: 'color' },
    propSchema: [
      { key: 'color', label: 'Lightning Color', type: 'color', default: '#5227FF', featured: true },
      { key: 'size', label: 'Size', type: 'number', default: 1, min: 0.5, max: 3, step: 0.1, featured: true },
      { key: 'blur', label: 'Blur', type: 'number', default: 0, min: 0, max: 20, step: 1 },
    ],
  },
  {
    key: 'ripple-grid',
    name: 'Ripple Grid',
    category: 'Backgrounds',
    description: 'Grid ripple on mouse interaction',
    tags: ['technical', 'minimal', 'interactive', 'saas', 'modern'],
    brandDNAMapping: { accentColor: 'color' },
    propSchema: [
      { key: 'color', label: 'Ripple Color', type: 'color', default: '#5227FF', featured: true },
      { key: 'circleSize', label: 'Circle Size', type: 'number', default: 50, min: 20, max: 150, step: 5, featured: true },
    ],
  },
  {
    key: 'plasma',
    name: 'Plasma',
    category: 'Backgrounds',
    description: 'Colorful plasma lava lamp animation',
    tags: ['creative', 'colorful', 'bold', 'playful', 'retro'],
    propSchema: [
      { key: 'speed', label: 'Speed', type: 'number', default: 1, min: 0.1, max: 5, step: 0.1, featured: true },
    ],
  },
  {
    key: 'liquid-chrome',
    name: 'Liquid Chrome',
    category: 'Backgrounds',
    description: 'Shiny metallic liquid surface simulation',
    tags: ['luxury', 'premium', 'bold', 'modern', 'refined'],
    propSchema: [
      { key: 'saturation', label: 'Saturation', type: 'number', default: 1, min: 0, max: 3, step: 0.1, featured: true },
      { key: 'speed', label: 'Speed', type: 'number', default: 0.5, min: 0, max: 3, step: 0.1, featured: true },
    ],
  },
  {
    key: 'balatro',
    name: 'Balatro',
    category: 'Backgrounds',
    description: 'Psychedelic portal swirl inspired by Balatro',
    tags: ['gaming', 'creative', 'bold', 'playful', 'colorful'],
    brandDNAMapping: { primaryColor: 'color1', accentColor: 'color2' },
    propSchema: [
      { key: 'color1', label: 'Color 1', type: 'color', default: '#DE443B', featured: true },
      { key: 'color2', label: 'Color 2', type: 'color', default: '#006BB4', featured: true },
      { key: 'spinRotation', label: 'Rotation', type: 'number', default: -2.0, min: -5, max: 5, step: 0.1 },
    ],
  },
  {
    key: 'pixel-snow',
    name: 'Pixel Snow',
    category: 'Backgrounds',
    description: 'Pixel-art style snow falling background',
    tags: ['minimal', 'clean', 'seasonal', 'retro', 'playful'],
    propSchema: [
      { key: 'snowColor', label: 'Snow Color', type: 'color', default: '#FFFFFF', featured: true },
      { key: 'speed', label: 'Speed', type: 'number', default: 1, min: 0.1, max: 5, step: 0.1, featured: true },
    ],
  },
  {
    key: 'light-pillar',
    name: 'Light Pillar',
    category: 'Backgrounds',
    description: 'Atmospheric vertical light column effect',
    tags: ['premium', 'dark', 'luxury', 'moody', 'editorial'],
    brandDNAMapping: { accentColor: 'color' },
    propSchema: [
      { key: 'color', label: 'Pillar Color', type: 'color', default: '#FFFFFF', featured: true },
      { key: 'haloStrength', label: 'Halo', type: 'number', default: 0.5, min: 0, max: 2, step: 0.1, featured: true },
    ],
  },

  // ─── TEXT ANIMATIONS ───────────────────────────────────────────────────────
  {
    key: 'blur-text',
    name: 'Blur Text',
    category: 'TextAnimations',
    description: 'Text that animates in with a blur reveal',
    tags: ['minimal', 'clean', 'premium', 'modern', 'elegant'],
    brandDNAMapping: { primaryColor: 'className', tagline: 'text' },
    propSchema: [
      { key: 'text', label: 'Text', type: 'string', default: 'Your Brand Story', featured: true },
      { key: 'delay', label: 'Delay (ms)', type: 'number', default: 200, min: 0, max: 1000, step: 50, featured: true },
      { key: 'animateBy', label: 'Animate By', type: 'enum', default: 'words', options: ['words', 'letters'] },
    ],
  },
  {
    key: 'split-text',
    name: 'Split Text',
    category: 'TextAnimations',
    description: 'Text that splits apart and snaps together',
    tags: ['bold', 'editorial', 'modern', 'creative', 'portfolio'],
    brandDNAMapping: { tagline: 'text' },
    propSchema: [
      { key: 'text', label: 'Text', type: 'string', default: 'Hello World', featured: true },
      { key: 'delay', label: 'Delay (ms)', type: 'number', default: 100, min: 0, max: 500, step: 25, featured: true },
      { key: 'duration', label: 'Duration', type: 'number', default: 0.6, min: 0.2, max: 2, step: 0.1 },
    ],
  },
  {
    key: 'shiny-text',
    name: 'Shiny Text',
    category: 'TextAnimations',
    description: 'Shimmering light-sweep over text',
    tags: ['premium', 'luxury', 'elegant', 'bold', 'refined'],
    brandDNAMapping: { tagline: 'text' },
    propSchema: [
      { key: 'text', label: 'Text', type: 'string', default: 'Premium Experience', featured: true },
      { key: 'speed', label: 'Speed', type: 'number', default: 3, min: 0.5, max: 10, step: 0.5, featured: true },
    ],
  },
  {
    key: 'gradient-text',
    name: 'Gradient Text',
    category: 'TextAnimations',
    description: 'Text with animated gradient fill',
    tags: ['bold', 'creative', 'modern', 'saas', 'colorful'],
    brandDNAMapping: { primaryColor: 'from', accentColor: 'to', tagline: 'text' },
    propSchema: [
      { key: 'text', label: 'Text', type: 'string', default: 'Build Faster', featured: true },
      { key: 'from', label: 'From Color', type: 'color', default: '#B17BFF', featured: true },
      { key: 'to', label: 'To Color', type: 'color', default: '#5227FF', featured: true },
    ],
  },
  {
    key: 'rotating-text',
    name: 'Rotating Text',
    category: 'TextAnimations',
    description: 'Cycling words that rotate in and out',
    tags: ['saas', 'modern', 'clean', 'bold', 'technical'],
    propSchema: [
      { key: 'texts', label: 'Words (comma-sep)', type: 'string', default: 'Design,Build,Ship', featured: true },
      { key: 'duration', label: 'Duration', type: 'number', default: 2000, min: 500, max: 5000, step: 250, featured: true },
    ],
  },
  {
    key: 'decrypted-text',
    name: 'Decrypted Text',
    category: 'TextAnimations',
    description: 'Matrix-style decrypt scramble effect',
    tags: ['technical', 'hacker', 'dark', 'futuristic', 'bold'],
    propSchema: [
      { key: 'text', label: 'Text', type: 'string', default: 'Hello World', featured: true },
      { key: 'speed', label: 'Speed (ms)', type: 'number', default: 50, min: 20, max: 200, step: 10, featured: true },
    ],
  },
  {
    key: 'count-up',
    name: 'Count Up',
    category: 'TextAnimations',
    description: 'Animated number counter that counts up',
    tags: ['saas', 'dashboard', 'bold', 'stats', 'technical'],
    propSchema: [
      { key: 'from', label: 'From', type: 'number', default: 0, min: 0, max: 9999, step: 1, featured: true },
      { key: 'to', label: 'To', type: 'number', default: 100, min: 1, max: 99999, step: 1, featured: true },
      { key: 'duration', label: 'Duration (ms)', type: 'number', default: 2000, min: 500, max: 5000, step: 250 },
    ],
  },
  {
    key: 'scroll-reveal',
    name: 'Scroll Reveal',
    category: 'TextAnimations',
    description: 'Text that reveals word-by-word on scroll',
    tags: ['editorial', 'premium', 'minimal', 'reading', 'storytelling'],
    propSchema: [
      { key: 'text', label: 'Text', type: 'string', default: 'Every great brand tells a story worth remembering.', featured: true },
      { key: 'threshold', label: 'Threshold', type: 'number', default: 0.1, min: 0, max: 1, step: 0.05, featured: true },
    ],
  },
  {
    key: 'scrambled-text',
    name: 'Scrambled Text',
    category: 'TextAnimations',
    description: 'Randomised letter scramble on hover',
    tags: ['creative', 'technical', 'interactive', 'bold', 'hacker'],
    propSchema: [
      { key: 'text', label: 'Text', type: 'string', default: 'Hover me', featured: true },
      { key: 'speed', label: 'Speed (ms)', type: 'number', default: 50, min: 20, max: 200, step: 10, featured: true },
    ],
  },
  {
    key: 'text-type',
    name: 'Text Type',
    category: 'TextAnimations',
    description: 'Classic typewriter effect',
    tags: ['minimal', 'technical', 'clean', 'saas', 'developer-tools'],
    brandDNAMapping: { tagline: 'text' },
    propSchema: [
      { key: 'text', label: 'Text', type: 'string', default: 'Building the future...', featured: true },
      { key: 'speed', label: 'Speed (ms)', type: 'number', default: 100, min: 30, max: 300, step: 10, featured: true },
    ],
  },
  {
    key: 'curved-loop',
    name: 'Curved Loop',
    category: 'TextAnimations',
    description: 'Text looping around a curved SVG path',
    tags: ['editorial', 'creative', 'logo', 'brand', 'premium'],
    brandDNAMapping: { tagline: 'text' },
    propSchema: [
      { key: 'text', label: 'Text', type: 'string', default: 'Your Brand • Your Vision • ', featured: true },
      { key: 'speed', label: 'Speed', type: 'number', default: 2, min: 0.5, max: 10, step: 0.5, featured: true },
    ],
  },

  // ─── ANIMATIONS ───────────────────────────────────────────────────────────
  {
    key: 'fade-content',
    name: 'Fade Content',
    category: 'Animations',
    description: 'Fade in any content with customizable direction',
    tags: ['minimal', 'clean', 'modern', 'saas', 'refined'],
    propSchema: [
      { key: 'blur', label: 'Blur', type: 'boolean', default: true, featured: true },
      { key: 'duration', label: 'Duration (ms)', type: 'number', default: 1000, min: 200, max: 3000, step: 100, featured: true },
      { key: 'direction', label: 'Direction', type: 'enum', default: 'up', options: ['up', 'down', 'left', 'right'] },
    ],
  },
  {
    key: 'click-spark',
    name: 'Click Spark',
    category: 'Animations',
    description: 'Particle spark burst on click',
    tags: ['playful', 'interactive', 'fun', 'creative', 'bold'],
    brandDNAMapping: { accentColor: 'sparkColor' },
    propSchema: [
      { key: 'sparkColor', label: 'Spark Color', type: 'color', default: '#FFC107', featured: true },
      { key: 'sparkSize', label: 'Size', type: 'number', default: 10, min: 3, max: 30, step: 1, featured: true },
      { key: 'sparkCount', label: 'Count', type: 'number', default: 8, min: 4, max: 20, step: 1 },
    ],
  },
  {
    key: 'magnetic-button',
    name: 'Magnetic Button',
    category: 'Animations',
    description: 'Button that magnetically attracts cursor',
    tags: ['interactive', 'premium', 'modern', 'creative', 'refined'],
    brandDNAMapping: { primaryColor: 'backgroundColor', tagline: 'children' },
    propSchema: [
      { key: 'children', label: 'Label', type: 'string', default: 'Get Started', featured: true },
      { key: 'backgroundColor', label: 'Background', type: 'color', default: '#5227FF', featured: true },
      { key: 'padding', label: 'Padding', type: 'string', default: '12px 32px' },
    ],
  },
  {
    key: 'logo-loop',
    name: 'Logo Loop',
    category: 'Animations',
    description: 'Horizontally scrolling logo ticker strip',
    tags: ['saas', 'social-proof', 'modern', 'clean', 'trust'],
    propSchema: [
      { key: 'speed', label: 'Speed', type: 'number', default: 50, min: 10, max: 200, step: 5, featured: true },
      { key: 'direction', label: 'Direction', type: 'enum', default: 'left', options: ['left', 'right'], featured: true },
    ],
  },
  {
    key: 'shuffle',
    name: 'Shuffle',
    category: 'Animations',
    description: 'Cards or items that shuffle on interaction',
    tags: ['creative', 'playful', 'interactive', 'bold', 'portfolio'],
    propSchema: [
      { key: 'speed', label: 'Speed (ms)', type: 'number', default: 500, min: 200, max: 1500, step: 50, featured: true },
    ],
  },

  // ─── COMPONENTS ───────────────────────────────────────────────────────────
  {
    key: 'spotlight-card',
    name: 'Spotlight Card',
    category: 'Components',
    description: 'Card with a spotlight highlight that follows the cursor',
    tags: ['saas', 'minimal', 'dark', 'modern', 'premium'],
    brandDNAMapping: { accentColor: 'spotlightColor' },
    propSchema: [
      { key: 'spotlightColor', label: 'Spotlight Color', type: 'color', default: 'rgba(82,39,255,0.15)', featured: true },
      { key: 'children', label: 'Content', type: 'string', default: 'Feature card content', featured: true },
    ],
  },
  {
    key: 'tilted-card',
    name: 'Tilted Card',
    category: 'Components',
    description: 'Card with 3D tilt on hover, parallax layers',
    tags: ['portfolio', 'creative', 'premium', 'bold', 'interactive'],
    propSchema: [
      { key: 'rotateAmplitude', label: 'Tilt Amount', type: 'number', default: 12, min: 5, max: 30, step: 1, featured: true },
      { key: 'scaleOnHover', label: 'Scale on Hover', type: 'number', default: 1.05, min: 1, max: 1.3, step: 0.01, featured: true },
      { key: 'displayOverlayContent', label: 'Show Overlay', type: 'boolean', default: true },
    ],
  },
  {
    key: 'glass-icons',
    name: 'Glass Icons',
    category: 'Components',
    description: 'Frosted glass icon set',
    tags: ['minimal', 'premium', 'dark', 'saas', 'glassmorphism'],
    brandDNAMapping: { accentColor: 'color' },
    propSchema: [
      { key: 'color', label: 'Tint Color', type: 'color', default: '#5227FF', featured: true },
      { key: 'size', label: 'Size', type: 'number', default: 60, min: 30, max: 120, step: 5, featured: true },
    ],
  },
  {
    key: 'dock',
    name: 'Dock',
    category: 'Components',
    description: 'macOS-style magnifying icon dock',
    tags: ['interactive', 'playful', 'premium', 'portfolio', 'creative'],
    propSchema: [
      { key: 'panelHeight', label: 'Height', type: 'number', default: 68, min: 40, max: 120, step: 4, featured: true },
      { key: 'magnification', label: 'Magnification', type: 'number', default: 70, min: 50, max: 120, step: 5, featured: true },
    ],
  },
  {
    key: 'magic-bento',
    name: 'Magic Bento',
    category: 'Components',
    description: 'Bento grid with magnetic hover effects on tiles',
    tags: ['saas', 'portfolio', 'modern', 'bold', 'interactive'],
    brandDNAMapping: { primaryColor: 'textColor', accentColor: 'borderColor' },
    propSchema: [
      { key: 'textColor', label: 'Text Color', type: 'color', default: '#fff', featured: true },
      { key: 'borderColor', label: 'Border Color', type: 'color', default: '#333', featured: true },
      { key: 'glowColor', label: 'Glow Color', type: 'color', default: '#5227FF' },
    ],
  },
  {
    key: 'bounce-cards',
    name: 'Bounce Cards',
    category: 'Components',
    description: 'Spring-physics card stack with bounce reveal',
    tags: ['playful', 'bold', 'creative', 'portfolio', 'fun'],
    propSchema: [
      { key: 'containerWidth', label: 'Width', type: 'number', default: 300, min: 200, max: 600, step: 20, featured: true },
    ],
  },
  {
    key: 'animated-list',
    name: 'Animated List',
    category: 'Components',
    description: 'Notification-style stacking list animation',
    tags: ['saas', 'dashboard', 'modern', 'clean', 'technical'],
    propSchema: [
      { key: 'delay', label: 'Delay (ms)', type: 'number', default: 1000, min: 200, max: 3000, step: 100, featured: true },
    ],
  },
  {
    key: 'circular-gallery',
    name: 'Circular Gallery',
    category: 'Components',
    description: 'Rotating 3D circular image gallery',
    tags: ['portfolio', 'creative', 'bold', 'gallery', 'photography'],
    propSchema: [
      { key: 'bend', label: 'Bend', type: 'number', default: 3, min: 0, max: 10, step: 0.5, featured: true },
    ],
  },
  {
    key: 'counter',
    name: 'Counter',
    category: 'Components',
    description: 'Slot-machine style animated number counter',
    tags: ['saas', 'dashboard', 'stats', 'bold', 'technical'],
    propSchema: [
      { key: 'value', label: 'Value', type: 'number', default: 1000, min: 0, max: 999999, step: 100, featured: true },
      { key: 'fontSize', label: 'Font Size', type: 'number', default: 80, min: 20, max: 200, step: 5, featured: true },
    ],
  },
  {
    key: 'profile-card',
    name: 'Profile Card',
    category: 'Components',
    description: 'Social-style profile card with glassmorphism',
    tags: ['social', 'portfolio', 'personal', 'glassmorphism', 'minimal'],
    propSchema: [
      { key: 'name', label: 'Name', type: 'string', default: 'Your Name', featured: true },
      { key: 'title', label: 'Title', type: 'string', default: 'Designer & Developer', featured: true },
      { key: 'avatarUrl', label: 'Avatar URL', type: 'string', default: '' },
    ],
  },
  {
    key: 'gooey-nav',
    name: 'Gooey Nav',
    category: 'Components',
    description: 'Navigation bar with gooey blob cursor',
    tags: ['creative', 'playful', 'modern', 'navigation', 'interactive'],
    brandDNAMapping: { accentColor: 'particleColor' },
    propSchema: [
      { key: 'particleColor', label: 'Particle Color', type: 'color', default: '#5227FF', featured: true },
      { key: 'particleCount', label: 'Particles', type: 'number', default: 15, min: 5, max: 40, step: 5 },
    ],
  },
  {
    key: 'elastic-slider',
    name: 'Elastic Slider',
    category: 'Components',
    description: 'Spring-physics elastic slider control',
    tags: ['interactive', 'playful', 'creative', 'ui', 'modern'],
    brandDNAMapping: { accentColor: 'startingValue' },
    propSchema: [
      { key: 'defaultValue', label: 'Default', type: 'number', default: 50, min: 0, max: 100, step: 1, featured: true },
      { key: 'startingValue', label: 'Start', type: 'number', default: 0, min: 0, max: 100, step: 1 },
      { key: 'maxValue', label: 'Max', type: 'number', default: 100, min: 1, max: 1000, step: 1 },
    ],
  },
  {
    key: 'card-swap',
    name: 'Card Swap',
    category: 'Components',
    description: 'Stacked cards that swap with spring animation',
    tags: ['portfolio', 'creative', 'bold', 'gallery', 'interactive'],
    propSchema: [
      { key: 'cardDistance', label: 'Card Distance', type: 'number', default: 30, min: 10, max: 80, step: 5, featured: true },
      { key: 'verticalDistance', label: 'Vertical Offset', type: 'number', default: 70, min: 20, max: 150, step: 5, featured: true },
    ],
  },
  {
    key: 'masonry',
    name: 'Masonry',
    category: 'Components',
    description: 'Responsive masonry grid layout with animation',
    tags: ['gallery', 'photography', 'portfolio', 'editorial', 'creative'],
    propSchema: [
      { key: 'columns', label: 'Columns', type: 'number', default: 3, min: 2, max: 6, step: 1, featured: true },
      { key: 'gap', label: 'Gap', type: 'number', default: 10, min: 4, max: 40, step: 2, featured: true },
    ],
  },
  {
    key: 'chroma-grid',
    name: 'Chroma Grid',
    category: 'Components',
    description: 'Colorful image grid with hover colour flash',
    tags: ['bold', 'editorial', 'creative', 'gallery', 'colorful'],
    propSchema: [
      { key: 'radius', label: 'Radius', type: 'number', default: 1, min: 0.5, max: 3, step: 0.1, featured: true },
    ],
  },
  {
    key: 'magic-bento',
    name: 'Magic Bento',
    category: 'Components',
    description: 'Bento grid with magnetic hovering effects',
    tags: ['saas', 'portfolio', 'modern', 'bold', 'interactive'],
    brandDNAMapping: { accentColor: 'borderColor', primaryColor: 'textColor' },
    propSchema: [
      { key: 'textColor', label: 'Text Color', type: 'color', default: '#fff', featured: true },
      { key: 'borderColor', label: 'Border', type: 'color', default: '#333', featured: true },
    ],
  },
  {
    key: 'infinite-menu',
    name: 'Infinite Menu',
    category: 'Components',
    description: 'WebGL distorted infinite scroll menu',
    tags: ['creative', 'bold', 'editorial', 'navigation', 'portfolio'],
    propSchema: [
      { key: 'distortion', label: 'Distortion', type: 'number', default: 0.7, min: 0, max: 2, step: 0.1, featured: true },
    ],
  },
  {
    key: 'flowing-menu',
    name: 'Flowing Menu',
    category: 'Components',
    description: 'Navigation links with flowing hover animation',
    tags: ['creative', 'editorial', 'bold', 'navigation', 'modern'],
    brandDNAMapping: { accentColor: 'marqueeBgColor' },
    propSchema: [
      { key: 'marqueeBgColor', label: 'Marquee Background', type: 'color', default: '#5227FF', featured: true },
      { key: 'marqueeTextColor', label: 'Marquee Text', type: 'color', default: '#ffffff', featured: true },
    ],
  },
  {
    key: 'pixel-card',
    name: 'Pixel Card',
    category: 'Components',
    description: 'Card with pixel-art reveal animation on hover',
    tags: ['retro', 'creative', 'bold', 'gaming', 'technical'],
    brandDNAMapping: { accentColor: 'effectColor' },
    propSchema: [
      { key: 'variant', label: 'Variant', type: 'enum', default: 'default', options: ['default', 'pink', 'yellow', 'blue'], featured: true },
      { key: 'effectColor', label: 'Effect Color', type: 'color', default: '#5227FF', featured: true },
    ],
  },
  {
    key: 'stepper',
    name: 'Stepper',
    category: 'Components',
    description: 'Step-by-step progress UI component',
    tags: ['saas', 'onboarding', 'modern', 'clean', 'technical'],
    propSchema: [
      { key: 'initialStep', label: 'Initial Step', type: 'number', default: 1, min: 1, max: 5, step: 1, featured: true },
    ],
  },
  {
    key: 'carousel',
    name: 'Carousel',
    category: 'Components',
    description: 'Drag-to-scroll horizontal carousel',
    tags: ['saas', 'portfolio', 'gallery', 'modern', 'clean'],
    propSchema: [
      { key: 'autoplay', label: 'Autoplay', type: 'boolean', default: false, featured: true },
      { key: 'autoplayDelay', label: 'Delay (ms)', type: 'number', default: 2000, min: 500, max: 6000, step: 250, featured: true },
    ],
  },
  {
    key: 'animated-list',
    name: 'Animated List',
    category: 'Components',
    description: 'Notification-style live stacking list',
    tags: ['saas', 'dashboard', 'live', 'modern', 'technical'],
    propSchema: [
      { key: 'delay', label: 'Item Delay (ms)', type: 'number', default: 1000, min: 200, max: 3000, step: 100, featured: true },
    ],
  },
  {
    key: 'stack',
    name: 'Stack',
    category: 'Components',
    description: 'Swipeable draggable polaroid-style card stack',
    tags: ['portfolio', 'gallery', 'creative', 'interactive', 'photography'],
    propSchema: [
      { key: 'randomRotation', label: 'Random Rotation', type: 'boolean', default: true, featured: true },
      { key: 'sensitivity', label: 'Sensitivity', type: 'number', default: 180, min: 50, max: 400, step: 10, featured: true },
    ],
  },
  {
    key: 'scroll-stack',
    name: 'Scroll Stack',
    category: 'Components',
    description: 'Cards that stack up as you scroll',
    tags: ['editorial', 'premium', 'storytelling', 'scroll', 'creative'],
    propSchema: [
      { key: 'sendToBackOnClick', label: 'Send to Back on Click', type: 'boolean', default: false, featured: true },
    ],
  },
  {
    key: 'glass-surface',
    name: 'Glass Surface',
    category: 'Components',
    description: 'Apple-style glass material with real blur and lighting',
    tags: ['glassmorphism', 'premium', 'minimal', 'apple', 'modern'],
    propSchema: [
      { key: 'blurAmount', label: 'Blur', type: 'number', default: 8, min: 0, max: 30, step: 1, featured: true },
      { key: 'saturation', label: 'Saturation', type: 'number', default: 1.8, min: 1, max: 3, step: 0.1, featured: true },
    ],
  },
  {
    key: 'gooey-nav',
    name: 'Gooey Nav',
    category: 'Components',
    description: 'Navigation with gooey particle trails',
    tags: ['creative', 'playful', 'modern', 'navigation', 'interactive'],
    brandDNAMapping: { accentColor: 'particleColor' },
    propSchema: [
      { key: 'particleColor', label: 'Particle Color', type: 'color', default: '#5227FF', featured: true },
      { key: 'particleCount', label: 'Particles', type: 'number', default: 15, min: 5, max: 40, step: 5, featured: true },
    ],
  },
  {
    key: 'pill-nav',
    name: 'Pill Nav',
    category: 'Components',
    description: 'Navigation with animated pill indicator',
    tags: ['minimal', 'clean', 'saas', 'modern', 'navigation'],
    brandDNAMapping: { accentColor: 'activeColor' },
    propSchema: [
      { key: 'activeColor', label: 'Active Color', type: 'color', default: '#5227FF', featured: true },
    ],
  },
  {
    key: 'card-nav',
    name: 'Card Nav',
    category: 'Components',
    description: 'Navigation with large card hover previews',
    tags: ['premium', 'editorial', 'creative', 'navigation', 'bold'],
    propSchema: [
      { key: 'hoverEffect', label: 'Hover Effect', type: 'enum', default: 'slide', options: ['slide', 'fade', 'scale'], featured: true },
    ],
  },
  {
    key: 'bubble-menu',
    name: 'Bubble Menu',
    category: 'Components',
    description: 'Navigation links that bubble pop open',
    tags: ['playful', 'creative', 'fun', 'navigation', 'bold'],
    brandDNAMapping: { accentColor: 'bubbleColor' },
    propSchema: [
      { key: 'bubbleColor', label: 'Bubble Color', type: 'color', default: '#5227FF', featured: true },
    ],
  },
  {
    key: 'dome-gallery',
    name: 'Dome Gallery',
    category: 'Components',
    description: '3D dome sphere image gallery draggable by mouse',
    tags: ['3d', 'gallery', 'creative', 'bold', 'portfolio'],
    propSchema: [
      { key: 'segments', label: 'Segments', type: 'number', default: 34, min: 10, max: 60, step: 2, featured: true },
      { key: 'grayscale', label: 'Grayscale', type: 'boolean', default: true, featured: true },
    ],
  },
  {
    key: 'model-viewer',
    name: 'Model Viewer',
    category: 'Components',
    description: 'Interactive GLTF/GLB 3D model viewer',
    tags: ['3d', 'portfolio', 'product', 'premium', 'creative'],
    propSchema: [
      { key: 'rotationSpeed', label: 'Rotation Speed', type: 'number', default: 0.005, min: 0, max: 0.05, step: 0.001, featured: true },
    ],
  },
  {
    key: 'fluid-glass',
    name: 'Fluid Glass',
    category: 'Components',
    description: 'Fluid glass lens distortion panel',
    tags: ['glassmorphism', 'premium', 'creative', 'bold', 'modern'],
    propSchema: [
      { key: 'displacement', label: 'Displacement', type: 'number', default: 100, min: 10, max: 300, step: 10, featured: true },
      { key: 'blur', label: 'Blur', type: 'number', default: 0.25, min: 0, max: 2, step: 0.05, featured: true },
    ],
  },
  {
    key: 'flying-posters',
    name: 'Flying Posters',
    category: 'Components',
    description: 'Posters that fly through 3D space on scroll',
    tags: ['creative', 'editorial', 'bold', 'gallery', '3d'],
    propSchema: [
      { key: 'speed', label: 'Speed', type: 'number', default: 1, min: 0.1, max: 5, step: 0.1, featured: true },
    ],
  },
  {
    key: 'staggered-menu',
    name: 'Staggered Menu',
    category: 'Components',
    description: 'Full-screen menu with staggered reveal',
    tags: ['editorial', 'portfolio', 'bold', 'navigation', 'creative'],
    brandDNAMapping: { accentColor: 'accentColor' },
    propSchema: [
      { key: 'accentColor', label: 'Accent Color', type: 'color', default: '#5227FF', featured: true },
      { key: 'displaySocials', label: 'Show Socials', type: 'boolean', default: true, featured: true },
    ],
  },
  {
    key: 'reflective-card',
    name: 'Reflective Card',
    category: 'Components',
    description: 'Card with Apple-liquid-glass reflective surface',
    tags: ['premium', 'glassmorphism', 'apple', 'luxury', 'modern'],
    propSchema: [
      { key: 'metalness', label: 'Metalness', type: 'number', default: 1, min: 0, max: 1, step: 0.05, featured: true },
      { key: 'roughness', label: 'Roughness', type: 'number', default: 0.4, min: 0, max: 1, step: 0.05, featured: true },
    ],
  },
]

// ── Lookup helpers ────────────────────────────────────────────────────────────

export const REGISTRY_MAP: Record<string, ComponentEntry> = Object.fromEntries(
  REGISTRY.map(c => [c.key, c])
)

export const REGISTRY_BY_CATEGORY = REGISTRY.reduce<Record<string, ComponentEntry[]>>(
  (acc, c) => {
    if (!acc[c.category]) acc[c.category] = []
    acc[c.category].push(c)
    return acc
  },
  {}
)

export const CATEGORY_ORDER = ['Backgrounds', 'TextAnimations', 'Animations', 'Components'] as const
