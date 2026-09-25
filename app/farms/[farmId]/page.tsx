import ScareGrowDashboard from '@/components/scaregrow-dashboard'

export default async function FarmDetailRoute({ params }: { params: Promise<{ farmId: string }> }) {
  const { farmId } = await params
  return <ScareGrowDashboard initialPage="Farms" farmId={farmId} />
}
