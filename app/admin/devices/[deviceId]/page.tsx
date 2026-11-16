import GreenerDashboard from '@/components/greener-dashboard'

export default async function Page({ params }: { params: Promise<{ deviceId: string }> }) {
  const { deviceId } = await params
  return <GreenerDashboard adminSection="devices" adminDeviceId={deviceId} />
}
