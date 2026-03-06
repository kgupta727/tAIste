'use client'

import { useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { Dna, Sparkles, Palette, Type, Eye, Clock, Target, Loader2, AlertCircle } from 'lucide-react'
import AnimatedCounter from '../components/common/AnimatedCounter'
import { useBrandDNA } from '../hooks/useBrandDNA'

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 180, damping: 24 } },
}

function ConfidenceCircle({ score }) {
  const circumference = 2 * Math.PI * 40
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  return (
    <div ref={ref} className="relative w-24 h-24">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" stroke="#27272A" strokeWidth="8" fill="none" />
        <motion.circle
          cx="50" cy="50" r="40"
          stroke="#A78BFA"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={inView ? { strokeDashoffset: circumference * (1 - score / 100) } : {}}
          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[#FAFAFA] text-xl font-bold">
          <AnimatedCounter target={score} suffix="%" duration={1500} />
        </span>
      </div>
    </div>
  )
}

function ColorBar({ color, delay = 0 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  return (
    <div ref={ref} className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl border border-white/10 flex-shrink-0" style={{ background: color.hex }} />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1.5">
          <div>
            <span className="text-[#FAFAFA] text-sm font-medium">{color.name}</span>
            <span className="text-[#A1A1AA] text-xs ml-2 font-mono">{color.hex}</span>
          </div>
          <span className="text-[#A1A1AA] text-sm">{color.percentage}%</span>
        </div>
        <div className="w-full bg-[#27272A] rounded-full h-2">
          <motion.div
            className="h-2 rounded-full"
            initial={{ width: 0 }}
            animate={inView ? { width: `${color.percentage}%` } : {}}
            transition={{ delay, duration: 1, ease: [0.16, 1, 0.3, 1] }}
            style={{ background: `linear-gradient(to right, ${color.hex}, ${color.hex}99)` }}
          />
        </div>
      </div>
    </div>
  )
}

function TypographyConfBar({ style, index }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  return (
    <div ref={ref} className="flex items-center gap-4">
      <div className="w-48 flex-shrink-0">
        <p className="text-[#FAFAFA] text-sm font-medium">{style.style}</p>
        <p className="text-[#A1A1AA] text-xs mt-0.5">{style.description}</p>
      </div>
      <div className="flex-1 bg-[#27272A] rounded-full h-2">
        <motion.div
          className="h-2 rounded-full bg-gradient-to-r from-accent to-[#5E6AD2]"
          initial={{ width: 0 }}
          animate={inView ? { width: `${style.confidence}%` } : {}}
          transition={{ delay: index * 0.15, duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <span className="text-[#A1A1AA] text-sm w-8 text-right">{style.confidence}%</span>
    </div>
  )
}

export default function BrandDNA() {
  const { brandDNA, isLoading, isReanalyzing, reanalyzeBrandDNA } = useBrandDNA()
  const [reanalyzeError, setReanalyzeError] = useState(null)

  const handleReanalyze = async () => {
    setReanalyzeError(null)
    const result = await reanalyzeBrandDNA()
    if (result?.error) setReanalyzeError(result.error)
  }

  if (isLoading || !brandDNA) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const { meta, colorPalette, typography, visualTone, aestheticSignature } = brandDNA

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="px-8 py-8 max-w-6xl mx-auto space-y-10"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#FAFAFA] flex items-center gap-3">
            <Dna className="text-accent" size={28} />
            Brand DNA
          </h1>
          <p className="text-[#A1A1AA] mt-1">AI-extracted patterns from your {meta.itemsAnalyzed} saved items</p>
        </div>
        <button
          onClick={handleReanalyze}
          disabled={isReanalyzing}
          className="flex items-center gap-2 px-4 py-2 bg-accent/20 border border-accent/40 rounded-xl text-accent text-sm font-medium hover:bg-accent/30 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        >
          {isReanalyzing ? (
            <><Loader2 size={14} className="animate-spin" /> Analyzing...</>
          ) : (
            <><Sparkles size={14} /> Re-analyze</>
          )}
        </button>
      </motion.div>
      {reanalyzeError && (
        <motion.div variants={itemVariants} className="flex items-center gap-2 text-amber-400 text-sm bg-amber-400/10 border border-amber-400/20 rounded-xl px-4 py-3">
          <AlertCircle size={16} />{reanalyzeError}
        </motion.div>
      )}

      {/* Overview Bar */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Items Analyzed',
            value: <AnimatedCounter target={meta.itemsAnalyzed} />,
            icon: Target,
            color: '#A78BFA',
          },
          {
            label: 'Confidence',
            value: <ConfidenceCircle score={meta.confidenceScore} />,
            icon: null,
            color: '#60A5FA',
            tall: true,
          },
          {
            label: 'Last Analyzed',
            value: meta.lastAnalyzed,
            icon: Clock,
            color: '#34D399',
            text: true,
          },
          {
            label: 'Dominant Style',
            value: meta.dominantStyle,
            icon: Eye,
            color: '#F59E0B',
            text: true,
          },
        ].map(({ label, value, icon: Icon, color, text, tall }) => (
          <div key={label} className="bg-[#18181B] border border-[#3F3F46] rounded-xl p-5 flex flex-col items-center gap-3">
            {Icon && <Icon size={18} style={{ color }} />}
            {tall ? (
              value
            ) : (
              <div className={`font-bold text-[#FAFAFA] ${text ? 'text-lg text-center' : 'text-3xl'}`}>{value}</div>
            )}
            <p className="text-[#A1A1AA] text-sm text-center">{label}</p>
          </div>
        ))}
      </motion.div>

      {/* Color Palette */}
      <motion.div variants={itemVariants} className="bg-[#18181B] border border-[#3F3F46] rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <Palette size={20} className="text-accent" />
          <h2 className="text-xl font-semibold text-[#FAFAFA]">Color Palette</h2>
        </div>

        <div className="space-y-8">
          {/* Primary */}
          <div>
            <h3 className="text-[#A1A1AA] text-sm font-medium uppercase tracking-wider mb-4">Primary Colors</h3>
            <div className="space-y-4">
              {colorPalette.primary.map((color, i) => (
                <ColorBar key={color.hex} color={color} delay={i * 0.1} />
              ))}
            </div>
          </div>

          {/* Accent */}
          <div>
            <h3 className="text-[#A1A1AA] text-sm font-medium uppercase tracking-wider mb-4">Accent Colors</h3>
            <div className="flex gap-4">
              {colorPalette.accent.map((color) => (
                <div key={color.hex} className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 rounded-xl border border-white/10" style={{ background: color.hex }} />
                  <div className="text-center">
                    <p className="text-[#FAFAFA] text-xs font-medium">{color.name}</p>
                    <p className="text-[#A1A1AA] text-[10px] font-mono">{color.hex}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Neutral */}
          <div>
            <h3 className="text-[#A1A1AA] text-sm font-medium uppercase tracking-wider mb-4">Neutral Colors</h3>
            <div className="flex gap-4">
              {colorPalette.neutral.map((color) => (
                <div key={color.hex} className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 rounded-xl border border-white/10" style={{ background: color.hex }} />
                  <div className="text-center">
                    <p className="text-[#FAFAFA] text-xs font-medium">{color.name}</p>
                    <p className="text-[#A1A1AA] text-[10px] font-mono">{color.hex}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Harmony */}
          <div className="bg-[#27272A] rounded-xl p-4 border border-[#3F3F46]">
            <p className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider mb-2">Harmony Note</p>
            <p className="text-[#FAFAFA] text-sm leading-relaxed">{colorPalette.harmonyDescription}</p>
          </div>
        </div>
      </motion.div>

      {/* Typography */}
      <motion.div variants={itemVariants} className="bg-[#18181B] border border-[#3F3F46] rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <Type size={20} className="text-accent" />
          <h2 className="text-xl font-semibold text-[#FAFAFA]">Typography Instincts</h2>
        </div>

        <div className="space-y-6">
          {/* Detected styles */}
          <div>
            <h3 className="text-[#A1A1AA] text-sm font-medium uppercase tracking-wider mb-4">Detected Styles</h3>
            <div className="space-y-4">
              {typography.detected.map((style, i) => (
                <TypographyConfBar key={style.style} style={style} index={i} />
              ))}
            </div>
          </div>

          {/* Weights & Scale */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider mb-2">Preferred Weights</p>
              <div className="flex flex-wrap gap-2">
                {typography.weights.map((w) => (
                  <span key={w} className="px-3 py-1.5 bg-[#27272A] border border-[#3F3F46] rounded-lg text-[#FAFAFA] text-sm">{w}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider mb-2">Size Contrast</p>
              <span className="px-3 py-1.5 bg-[#27272A] border border-[#3F3F46] rounded-lg text-[#FAFAFA] text-sm">{typography.sizeContrast}</span>
            </div>
          </div>

          {/* Recommended fonts */}
          <div>
            <h3 className="text-[#A1A1AA] text-sm font-medium uppercase tracking-wider mb-4">Recommended Fonts</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {typography.recommendations.map((font, i) => (
                <motion.div
                  key={font.name}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-[#27272A] border border-[#3F3F46] rounded-xl p-4 hover:border-[#A78BFA]/50 transition-all"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[#FAFAFA] font-semibold" style={{ fontFamily: font.name }}>{font.name}</span>
                    <span className="text-xs px-2 py-0.5 bg-[#3F3F46] rounded-full text-[#A1A1AA]">{font.category}</span>
                  </div>
                  <p className="text-[#A1A1AA] text-xs leading-relaxed">{font.reason}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Visual Tone */}
      <motion.div variants={itemVariants} className="bg-[#18181B] border border-[#3F3F46] rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <Eye size={20} className="text-accent" />
          <h2 className="text-xl font-semibold text-[#FAFAFA]">Visual Tone</h2>
        </div>

        {/* Word cloud effect */}
        <div className="flex flex-wrap gap-3 mb-6">
          {visualTone.descriptors.map(({ label, weight }) => (
            <motion.span
              key={label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.random() * 0.5 }}
              className="px-4 py-2 bg-[#27272A] border border-[#3F3F46] rounded-full text-[#FAFAFA] hover:border-accent/50 hover:bg-accent/10 transition-all cursor-default"
              style={{
                fontSize: `${0.75 + weight * 0.5}rem`,
                opacity: 0.5 + weight * 0.5,
                fontWeight: weight > 0.7 ? 600 : 400,
              }}
            >
              {label}
            </motion.span>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
          {[
            { label: 'Contrast Level', value: visualTone.contrastLevel, color: '#A78BFA' },
            { label: 'Whitespace', value: visualTone.whitespacePreference, color: '#60A5FA' },
            { label: 'Visual Weight', value: 'Heavy → Balanced', color: '#34D399' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[#27272A] border border-[#3F3F46] rounded-xl p-4">
              <p className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
              <p className="font-semibold" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>

        <div className="bg-[#27272A] rounded-xl p-4 border border-[#3F3F46]">
          <p className="text-[#FAFAFA] text-sm leading-relaxed">{visualTone.summary}</p>
        </div>
      </motion.div>

      {/* Aesthetic Signature */}
      <motion.div
        variants={itemVariants}
        className="relative bg-[#18181B] rounded-2xl p-8 overflow-hidden"
        style={{
          borderWidth: 1,
          borderStyle: 'solid',
          borderImage: 'linear-gradient(135deg, #A78BFA, #5E6AD2, transparent) 1',
        }}
      >
        {/* Gradient border workaround */}
        <div className="absolute inset-0 rounded-2xl" style={{
          background: 'linear-gradient(135deg, rgba(167,139,250,0.15) 0%, rgba(94,106,210,0.08) 50%, transparent 100%)',
          pointerEvents: 'none',
        }} />
        <div className="absolute inset-[1px] rounded-2xl bg-[#18181B]" style={{ pointerEvents: 'none', zIndex: 0 }} />

        {/* Actual gradient border */}
        <div className="absolute inset-0 rounded-2xl" style={{
          padding: 1,
          background: 'linear-gradient(135deg, #A78BFA44, #5E6AD244, transparent)',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          pointerEvents: 'none',
          zIndex: 1,
        }} />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-5">
            <Sparkles size={20} className="text-accent" />
            <h2 className="text-xl font-semibold text-[#FAFAFA]">Aesthetic Signature</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className="text-accent text-xs font-medium uppercase tracking-wider mb-2">Archetype</p>
              <h3 className="text-3xl font-bold text-[#FAFAFA] mb-1">{aestheticSignature.archetype}</h3>
              <p className="text-[#A78BFA] font-medium italic">{aestheticSignature.tagline}</p>
              <p className="text-[#A1A1AA] text-sm leading-relaxed mt-4">{aestheticSignature.description}</p>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider mb-2">Influences</p>
                <div className="flex flex-wrap gap-2">
                  {aestheticSignature.influences.map((inf) => (
                    <span key={inf} className="px-3 py-1.5 bg-[#27272A] border border-[#A78BFA]/30 rounded-lg text-[#A78BFA] text-sm">{inf}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[#A1A1AA] text-xs font-medium uppercase tracking-wider mb-2">Keywords</p>
                <div className="flex flex-wrap gap-2">
                  {aestheticSignature.keywords.map((kw) => (
                    <span key={kw} className="px-3 py-1.5 bg-[#27272A] border border-[#3F3F46] rounded-lg text-[#FAFAFA] text-sm">{kw}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
