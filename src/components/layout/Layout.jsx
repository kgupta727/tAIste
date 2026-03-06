'use client'

import Sidebar from './Sidebar'
import TopBar from './TopBar'
import SaveModal from '../modals/SaveModal'

export default function Layout({ children }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#09090B]">
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
