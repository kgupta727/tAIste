'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Layers,
  Dna,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  LogOut,
  Sparkles,
} from 'lucide-react'
import { useUIStore } from '../../store/uiStore'
import { createClient } from '../../lib/supabase/client'

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/swipe-file', icon: Layers, label: 'Swipe File' },
  { to: '/brand-dna', icon: Dna, label: 'Brand DNA' },
  { to: '/brand-kit', icon: Package, label: 'Brand Kit' },
  { to: '/get-inspired', icon: Sparkles, label: 'Get Inspired' },
]

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, openSaveModal } = useUIStore()
  const pathname = usePathname()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/sign-in'
  }

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 64 : 240 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="flex flex-col h-screen bg-surface border-r border-[#3F3F46] relative z-20 flex-shrink-0"
      style={{ backdropFilter: 'blur(12px)' }}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-[#3F3F46] flex-shrink-0 overflow-hidden">
        <motion.div
          className="flex items-center gap-3 min-w-0"
          animate={{ opacity: 1 }}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-[#5E6AD2] flex items-center justify-center flex-shrink-0">
            <Sparkles size={16} className="text-white" />
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="font-bold text-[#FAFAFA] text-lg tracking-tight whitespace-nowrap"
              >
                Tastestack
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Save New CTA */}
      <div className="px-3 py-4 border-b border-[#3F3F46]">
        <motion.button
          onClick={openSaveModal}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="w-full flex items-center gap-2 bg-accent hover:bg-accent-hover text-white font-semibold rounded-xl px-3 py-2.5 text-sm transition-colors overflow-hidden"
        >
          <Plus size={16} className="flex-shrink-0" />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="whitespace-nowrap overflow-hidden"
              >
                Save New
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const isActive = to === '/' ? pathname === '/' : pathname.startsWith(to)
          return (
            <Link
              key={to}
              href={to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative group overflow-hidden ${
                isActive
                  ? 'bg-[#27272A] text-[#A78BFA]'
                  : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A]'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent rounded-r-full"
                />
              )}
              <Icon size={18} className="flex-shrink-0" />
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    className="whitespace-nowrap"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 pb-4 space-y-1 border-t border-[#3F3F46] pt-3">
        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs text-[#A1A1AA] hover:text-red-400 hover:bg-[#27272A] transition-all overflow-hidden"
          title="Sign out"
        >
          <LogOut size={16} className="flex-shrink-0" />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="whitespace-nowrap"
              >
                Sign Out
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A] transition-all overflow-hidden"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen size={16} className="flex-shrink-0" />
          ) : (
            <PanelLeftClose size={16} className="flex-shrink-0" />
          )}
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="whitespace-nowrap text-sm"
              >
                Collapse
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  )
}
