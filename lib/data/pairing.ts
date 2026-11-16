import { createClient } from '@/lib/supabase/client'

export type PairDeviceOptions = { deviceId: string; deviceName?: string | null; farmName?: string | null; farmLocation?: string | null; farmId?: string | null }
export class PairingError extends Error {
  readonly code: string | undefined
  constructor(error: { message: string; code?: string }) {
    super(error.message, { cause: error })
    this.name = 'PairingError'
    this.code = error.code
  }
}
export async function pairDevice(options: PairDeviceOptions, signal?: AbortSignal): Promise<string> {
  const clean = (value?: string | null) => value?.trim() || null
  const deviceId = clean(options.deviceId)
  if (!deviceId) throw new PairingError({ message: 'Device ID is required' })
  const farmId = clean(options.farmId)
  let query = createClient().rpc('pair_device', {
    p_device_id: deviceId,
    p_device_name: clean(options.deviceName),
    p_farm_location: clean(options.farmLocation),
    ...(farmId ? { p_farm_id: farmId } : { p_farm_name: clean(options.farmName) }),
  })
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query
  // TODO: Backend must specify pairing error codes before adding mappings (§10).
  if (error) throw new PairingError(error)
  if (data === null) throw new PairingError({ message: 'Pairing returned no device ID' })
  return data
}
