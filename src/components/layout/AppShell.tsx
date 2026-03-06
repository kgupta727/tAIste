'use client'

import Sidebar from '@/src/components/layout/Sidebar'
import TopBar from '@/src/components/layout/TopBar'
import SaveModal from '@/src/components/modals/SaveModal'

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#09090B] overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      <SaveModal />
    </div>
  )
}
