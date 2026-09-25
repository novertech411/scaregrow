import GreenerDashboard from '@/components/greener-dashboard'

export default async function DeviceDetailRoute({
  params,
}: {
  params: Promise<{ deviceId: string }>
}) {
  const resolvedParams = await params
  return <GreenerDashboard initialPage="Devices" deviceId={resolvedParams.deviceId} />
}
