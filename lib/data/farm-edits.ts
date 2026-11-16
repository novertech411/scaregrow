import { updateFarm } from '@/lib/data/farms'

export function farmEdits(name: string, location: string) {
  if (!name.trim()) throw new Error('Farm name is required.')
  return { name: name.trim(), location: location.trim() || null }
}
export async function saveFarmDetails(id: string, name: string, location: string, signal?: AbortSignal) {
  const row = await updateFarm(id, farmEdits(name, location), signal)
  if (!row) throw new Error('The farm could not be saved. Please try again.')
  return row
}
