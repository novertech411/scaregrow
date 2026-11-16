import type { ReadingFilters } from '@/lib/services/readings'
import type { Parameter } from '@/lib/readings-view'

export type AssistantMessage = { role: 'user' | 'assistant'; content: string }
export type ReadingAssistantSelection = ReadingFilters & { page: number; parameter: Parameter | 'All' }
export type ReadingAssistantRequest = { selection: ReadingAssistantSelection; messages: AssistantMessage[] }

export type ReadingAssistantContext = {
  selection: ReadingAssistantSelection
  farms: Array<{ id: string; name: string }>
  plots: Array<{ id: string; name: string }>
  dateRange: { from: string; to: string }
  page: number
  totalReadings: number
  readings: Array<{
    deviceId: string
    sequence: number
    farmId?: string
    plotId?: string
    measuredAt: string
    moisture: number | null
    temperature: number | null
    ph: number | null
    ec: number | null
  }>
  thresholds: Array<{ plotId: string; configurations: unknown }>
  openAlerts: Array<{
    id: string
    deviceId: string | null
    farm: { id: string; name: string } | null
    plot: { id: string; name: string } | null
    type: string | null
    severity: string | null
    status: string | null
    triggeredAt: string | null
    currentValue: number | string | null
    thresholdValue: number | string | null
  }>
  availability: { thresholds: 'available' | 'unavailable'; openAlerts: 'available' | 'unavailable'; alertsMayBeTruncated: boolean }
}
