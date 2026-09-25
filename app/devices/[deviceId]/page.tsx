import ScareGrowDashboard from '@/components/scaregrow-dashboard'

export default async function DeviceDetailRoute({
  params,
}: {
  params: Promise<{ deviceId: string }>
}) {
  const resolvedParams = await params
  return <ScareGrowDashboard initialPage="Devices" deviceId={resolvedParams.deviceId} />
}
