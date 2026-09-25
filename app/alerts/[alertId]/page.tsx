import GreenerDashboard from '@/components/greener-dashboard'

export default async function AlertDetailRoute({ params }: { params: Promise<{ alertId: string }> }) {
  const { alertId } = await params
  return <GreenerDashboard initialPage="Alerts" alertId={alertId} />
}
