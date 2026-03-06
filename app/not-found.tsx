export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <div className="flex items-center justify-center h-screen bg-[#09090B]">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-[#A78BFA] mb-4">404</h1>
        <p className="text-[#A1A1AA] text-lg mb-6">This page doesn&apos;t exist.</p>
        <a href="/" className="text-[#A78BFA] hover:text-[#C4B5FD] underline underline-offset-4 transition-colors">
          Go back home
        </a>
      </div>
    </div>
  )
}
