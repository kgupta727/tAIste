# tAIste — AI-Powered Brand DNA Builder

tAIste helps you discover your unique visual identity. Save design inspirations, let AI analyze them for colors, mood, and typography, then synthesize everything into a complete Brand DNA profile you can export to any tool.

---

## Features

### Swipe File
Save design inspiration images from anywhere — Dribbble, Behance, the web, or direct uploads. Every image is stored with its source, tags, and notes. Browse your collection in a masonry grid with full search and tag filtering.

### AI Image Analysis
Each image is analyzed by GPT-4o for:
- **Dominant colors** — hex values, names, and percentage weights
- **Mood descriptors** — e.g. minimal, bold, editorial, playful
- **Typography styles** — detected font characteristics and design patterns
- **Layout patterns** — compositional descriptions
- **Visual tags** — auto-categorization

### Brand DNA
Once you've built up a swipe file, generate your Brand DNA — a synthesized identity profile that includes:
- **Aesthetic Signature** — archetype, tagline, description, influences, keywords
- **Color Palette** — primary and accent colors with roles and harmony description
- **Typography Recommendations** — font pairings with rationale
- **Visual Tone** — mood descriptors with weights, contrast level, whitespace preference
- **Confidence Score** — how distinctive and internally consistent your aesthetic is (0–100%)

### Brand Kit Export
Download your brand identity in formats ready for any workflow:

| Format | File | Use case |
|--------|------|----------|
| Claude Code | `.md` | Markdown brand guidelines |
| Lovable | `.json` | Design tokens for Lovable |
| Cursor | `.mdc` | Cursor rules with brand context |
| Figma Variables | `.json` | Import directly into Figma |
| Raw JSON | `.json` | Full structured brand data |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| State | Zustand + SWR |
| Auth & DB | Supabase (PostgreSQL + RLS) |
| Storage | Supabase Storage |
| AI | OpenAI GPT-4o |

---

## How It Works

1. **Save** — Drop an image URL or upload a file. The image is stored in Supabase Storage.
2. **Analyze** — GPT-4o vision processes the image and extracts design attributes.
3. **Build** — Over time your swipe file accumulates a rich set of analyzed inspirations.
4. **Generate** — Hit "Generate Brand DNA" — GPT-4o synthesizes all your analyses into a cohesive identity profile.
5. **Export** — Download your Brand Kit in the format that fits your workflow.

---

## Live Demo

[https://t-a-iste.vercel.app](https://t-a-iste.vercel.app)
