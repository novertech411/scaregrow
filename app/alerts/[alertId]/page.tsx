import ScareGrowDashboard from '@/components/scaregrow-dashboard'

export default async function AlertDetailRoute({ params }: { params: Promise<{ alertId: string }> }) {
  const { alertId } = await params
  return <ScareGrowDashboard initialPage="Alerts" alertId={alertId} />
}
