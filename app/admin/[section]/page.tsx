import { notFound } from 'next/navigation'
import GreenerDashboard from '@/components/greener-dashboard'
import { isAdminSection } from '@/lib/admin/navigation'

export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params
  if (!isAdminSection(section)) notFound()
  return <GreenerDashboard adminSection={section} />
}
