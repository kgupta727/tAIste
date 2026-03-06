// Server Component — allows route segment config for dynamic rendering
export const dynamic = 'force-dynamic'

import AppShell from '@/src/components/layout/AppShell'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
