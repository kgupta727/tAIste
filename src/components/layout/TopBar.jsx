'use client'

import { useState, useEffect } from 'react'
import { Search, Plus } from 'lucide-react'
import { useSwipeStore } from '../../store/swipeStore'
import { useUIStore } from '../../store/uiStore'
import { motion } from 'framer-motion'
import { createClient } from '../../lib/supabase/client'

export default function TopBar() {
  const { searchQuery, setSearch } = useSwipeStore()
  const { openSaveModal } = useUIStore()
  const [user, setUser] = useState(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'You'
  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : displayName.slice(0, 2).toUpperCase()

  return (
    <header className="h-16 border-b border-[#3F3F46] flex items-center justify-between px-6 bg-[#09090B]/80 backdrop-blur-sm flex-shrink-0 z-10">
      {/* Search */}
      <div className="relative flex-1 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA]" />
        <input
          type="text"
          placeholder="Search inspiration..."
          value={searchQuery}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#18181B] border border-[#3F3F46] rounded-xl pl-9 pr-3 py-2 text-sm text-[#FAFAFA] placeholder-[#A1A1AA] focus:outline-none focus:border-[#A78BFA] focus:ring-1 focus:ring-[#A78BFA]/30 transition-all"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <motion.button
          onClick={openSaveModal}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white font-semibold rounded-xl px-4 py-2 text-sm transition-colors"
        >
          <Plus size={15} />
          Save
        </motion.button>

        {/* Avatar */}
        <div className="flex items-center gap-2.5 ml-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#A78BFA] to-[#5E6AD2] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <span className="text-sm font-medium text-[#FAFAFA] hidden sm:block">{displayName}</span>
        </div>
      </div>
    </header>
  )
}
