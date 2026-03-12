'use client'

/**
 * PropsEditor — right panel for editing the selected canvas item's props.
 * Shows featured props by default; expandable to show all.
 * Color props surface brand DNA palette swatches.
 */

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { REGISTRY_MAP } from '@/src/playground/registry'
import { usePlaygroundStore } from '@/src/stores/playgroundStore'

// ── Prop controls ──────────────────────────────────────────────────────────────

function ColorControl({ schema, value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value.startsWith('#') ? value : '#5227FF'}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded border border-[#3F3F46] bg-transparent cursor-pointer p-0.5"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-2 py-1 bg-[#111113] border border-[#3F3F46] rounded text-xs text-[#FAFAFA] font-mono outline-none focus:border-[#5227FF]/60"
        spellCheck={false}
      />
    </div>
  )
}

// Edits a string[] as a comma-separated list of hex colors
function ColorListControl({ value, onChange }) {
  const str = Array.isArray(value) ? value.join(', ') : String(value)
  return (
    <input
      type="text"
      value={str}
      onChange={(e) => {
        const arr = e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
        onChange(arr)
      }}
      className="w-full px-2 py-1.5 bg-[#111113] border border-[#3F3F46] rounded text-xs text-[#FAFAFA] font-mono outline-none focus:border-[#5227FF]/60"
      placeholder="#111, #222, #333"
      spellCheck={false}
    />
  )
}

function NumberControl({ schema, value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={schema.min ?? 0}
        max={schema.max ?? 100}
        step={schema.step ?? 1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-[#5227FF] h-2"
      />
      <span className="text-xs text-[#A1A1AA] w-10 text-right tabular-nums">
        {typeof value === 'number' ? value.toFixed(value < 1 && value !== 0 ? 2 : 0) : value}
      </span>
    </div>
  )
}

function StringControl({ schema, value, onChange }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-2 py-1.5 bg-[#111113] border border-[#3F3F46] rounded text-xs text-[#FAFAFA] outline-none focus:border-[#5227FF]/60"
    />
  )
}

function BooleanControl({ schema, value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-10 h-5 rounded-full transition-colors ${value ? 'bg-[#5227FF]' : 'bg-[#3F3F46]'}`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
          value ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

function EnumControl({ schema, value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-2 py-1.5 bg-[#111113] border border-[#3F3F46] rounded text-xs text-[#FAFAFA] outline-none focus:border-[#5227FF]/60"
    >
      {schema.options?.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  )
}

function PropRow({ schema, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-[#A1A1AA]">{schema.label}</label>
      {schema.type === 'color' && (
        <ColorControl schema={schema} value={String(value ?? schema.default)} onChange={onChange} />
      )}
      {schema.type === 'color-list' && (
        <ColorListControl value={value ?? schema.default} onChange={onChange} />
      )}
      {schema.type === 'number' && (
        <NumberControl schema={schema} value={Number(value ?? schema.default)} onChange={onChange} />
      )}
      {schema.type === 'string' && (
        <StringControl schema={schema} value={String(value ?? schema.default)} onChange={(v) => onChange(v)} />
      )}
      {schema.type === 'boolean' && (
        <BooleanControl schema={schema} value={Boolean(value ?? schema.default)} onChange={onChange} />
      )}
      {schema.type === 'enum' && (
        <EnumControl schema={schema} value={String(value ?? schema.default)} onChange={onChange} />
      )}
    </div>
  )
}

// ── PropsEditor ────────────────────────────────────────────────────────────────

export default function PropsEditor() {
  const selectedItemId = usePlaygroundStore((s) => s.selectedItemId)
  const canvasItems = usePlaygroundStore((s) => s.canvasItems)
  const updateItemProps = usePlaygroundStore((s) => s.updateItemProps)
  const [showAll, setShowAll] = useState(false)

  const selectedItem = canvasItems.find((i) => i.id === selectedItemId)
  const entry = selectedItem ? REGISTRY_MAP[selectedItem.componentKey] : null

  if (!selectedItem || !entry) {
    return (
      <div className="w-64 flex flex-col items-center justify-center h-full text-center p-4 border-l border-[#3F3F46] bg-[#0E0E10]">
        <p className="text-xs text-[#52525B]">Select a component on the canvas to edit its props</p>
      </div>
    )
  }

  const visibleProps = showAll
    ? entry.propSchema
    : entry.propSchema.filter((p) => p.featured)

  return (
    <div className="w-64 flex flex-col h-full border-l border-[#3F3F46] bg-[#0E0E10] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#3F3F46]">
        <p className="text-sm font-semibold text-[#FAFAFA]">{entry.name}</p>
        <p className="text-xs text-[#71717A] mt-0.5">{entry.category}</p>
      </div>

      {/* Props list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-thin scrollbar-thumb-[#3F3F46]">
        {visibleProps.map((schema) => (
          <PropRow
            key={schema.key}
            schema={schema}
            value={selectedItem.props[schema.key]}
            onChange={(v) => updateItemProps(selectedItemId, { [schema.key]: v })}
          />
        ))}

        {/* Show all / collapse */}
        {entry.propSchema.length > visibleProps.length || showAll ? (
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-1.5 text-xs text-[#71717A] hover:text-[#A1A1AA] transition-colors pt-1"
          >
            {showAll ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {showAll ? 'Show fewer props' : `Show ${entry.propSchema.length - visibleProps.length} more props`}
          </button>
        ) : null}
      </div>

      {/* Reset to defaults */}
      <div className="px-4 py-3 border-t border-[#3F3F46]">
        <button
          onClick={() => {
            const defaults = entry.propSchema.reduce((acc, p) => {
              acc[p.key] = p.default
              return acc
            }, {})
            updateItemProps(selectedItemId, defaults)
          }}
          className="w-full py-1.5 text-xs text-[#71717A] hover:text-[#FAFAFA] border border-[#3F3F46] rounded-lg hover:border-[#5227FF]/40 transition-all"
        >
          Reset to defaults
        </button>
      </div>
    </div>
  )
}
