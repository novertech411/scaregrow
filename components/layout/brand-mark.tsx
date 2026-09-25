import Link from 'next/link'


export function BrandMark({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 group shrink-0">
      <div className="relative flex size-9 shrink-0 items-center justify-center p-1 rounded-xl bg-[#ffffff] text-white shadow-sm">
           <img src="/images/icon.png" alt="Greener" />
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold tracking-tight text-white">Greener</p>
          
        </div>
      )}
    </Link>
  )
}
