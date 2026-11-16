'use client'

import { FarmsPage } from '@/components/farms-page'

export function FarmDetailPage({ farmId }: { farmId: string }) {
  return <FarmsPage farmId={farmId} />
}
