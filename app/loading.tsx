import { PageLoading } from '@/components/ui/page-loading'

export default function Loading() {
  return (
    <main className="min-h-screen bg-[#f4f7f2] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <PageLoading />
      </div>
    </main>
  )
}
