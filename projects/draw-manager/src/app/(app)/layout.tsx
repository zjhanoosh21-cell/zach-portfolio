import { isAuthenticated } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import { prisma } from '@/lib/prisma'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const authenticated = await isAuthenticated()
  if (!authenticated) {
    redirect('/login')
  }

  const activeProjects = await prisma.project.findMany({
    where: { status: { in: ['active', 'in_draw', 'on_hold'] } },
    orderBy: { updated_at: 'desc' },
    select: { id: true, owner_name: true, address: true, status: true },
  })

  return <AppShell activeProjects={activeProjects}>{children}</AppShell>
}
