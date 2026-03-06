import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import SwipeFile from './pages/SwipeFile'
import InspirationDetail from './pages/InspirationDetail'
import BrandDNA from './pages/BrandDNA'
import BrandKit from './pages/BrandKit'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/swipe-file" element={<SwipeFile />} />
          <Route path="/swipe-file/:id" element={<InspirationDetail />} />
          <Route path="/brand-dna" element={<BrandDNA />} />
          <Route path="/brand-kit" element={<BrandKit />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
