import GreenerDashboard from '@/components/greener-dashboard'

export default async function FarmDetailRoute({ params }: { params: Promise<{ farmId: string }> }) {
  const { farmId } = await params
  return <GreenerDashboard initialPage="Farms" farmId={farmId} />
}
