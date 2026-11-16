import Link from 'next/link'

export function DeviceNotFound() {
  return <section className="rounded-2xl border border-[#d7e8dc] bg-white p-8 text-center"><h1 className="text-xl font-semibold text-[#123d2d]">Device not found</h1><p className="mt-2 text-sm text-slate-500">This device isn't available in your account.</p><Link href="/devices" className="mt-4 inline-block text-sm font-semibold text-[#1f7a52] hover:underline">← All devices</Link></section>
}
