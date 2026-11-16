import type { Alert, Reading } from '@/lib/types'

export type DashboardAiSummary = {
  status: 'healthy' | 'attention' | 'critical'
  headline: string
  shortSummary: string
  recommendation: string
}

export function buildAiSummary({ readings, alerts, openAlerts, criticalAlerts, offlineDevices }: {
  readings: Reading[]
  alerts: Alert[]
  openAlerts: number
  criticalAlerts: number
  offlineDevices: number
}): DashboardAiSummary {
  const open = alerts.filter((alert) => alert.status === 'Open')
  const critical = open.find((alert) => alert.severity === 'Critical')
  const alert = critical ?? open[0]
  const affected = readings.find((reading) => ['Critical', 'Warning', 'Offline'].includes(reading.status))
  const isCritical = criticalAlerts > 0 || !!critical || affected?.status === 'Critical'
  const needsAttention = openAlerts > 0 || !!alert || !!affected || offlineDevices > 0
  const location = alert && (alert.plot !== 'Unknown' ? alert.plot : alert.device !== '—' ? alert.device : undefined)

  if (isCritical || needsAttention) {
    return {
      status: isCritical ? 'critical' : 'attention',
      headline: isCritical ? 'Critical' : 'Attention',
      shortSummary: alert
        ? `${alert.type}${location ? ` · ${location}` : ''} needs review.`
        : isCritical ? 'A critical condition needs review.'
        : affected ? `${affected.device} reports ${affected.status.toLowerCase()} status.`
        : offlineDevices > 0 ? `${offlineDevices} monitored device${offlineDevices === 1 ? ' is' : 's are'} offline.`
        : 'Open alerts need review.',
      recommendation: isCritical ? 'Review the affected device and open alerts now.' : 'Review readings and check the affected devices.',
    }
  }
  if (!readings.length) {
    return { status: 'attention', headline: 'Attention', shortSummary: 'No recent readings are available to assess conditions.', recommendation: 'Check device reporting and review readings.' }
  }
  return { status: 'healthy', headline: 'Healthy', shortSummary: 'No open alerts or device warnings in the loaded data.', recommendation: 'Continue monitoring; review the latest readings.' }
}
