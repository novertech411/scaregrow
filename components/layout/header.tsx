'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Bell, ChevronDown, Menu, Search } from 'lucide-react'
import type { PageKey } from '@/lib/types'
import type { CurrentProfile } from '@/lib/supabase/profile'
import { createClient } from '@/lib/supabase/client'
import { getNotifications, getUnreadCount, markAsRead } from '@/lib/services/notifications'
import { toNotification } from '@/lib/services/presenters'
import type { NotificationItem } from '@/lib/types'
import { BrandMark } from './brand-mark'

export function Header({
  active,
  search,
  setSearch,
  setMobileOpen,
  profile,
}: {
  active: PageKey
  search: string
  setSearch: (value: string) => void
  setMobileOpen: (value: boolean) => void
  profile: CurrentProfile | null
}) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [readIds, setReadIds] = useState<string[]>([])
  const [unread, setUnread] = useState(0)
  const [notificationError, setNotificationError] = useState('')
  useEffect(() => {
    createClient().auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const [rows, count] = await Promise.all([getNotifications(data.user.id), getUnreadCount(data.user.id)])
      setNotifications(rows.map(toNotification))
      setReadIds(rows.filter((row) => (row as Record<string, unknown>).read_at).map((row) => String((row as Record<string, unknown>).id)))
      setUnread(count)
    }).catch((error) => setNotificationError(error.message))
  }, [])
  const router = useRouter()

  useEffect(() => {
    const close = () => setOpen(false)
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    if (!open) return
    document.addEventListener('click', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('click', close)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  return (
    <header className="flex h-[50px] items-center gap-3 border-b border-[#d8e5d9] bg-[#fbfdf9] px-4 sm:px-6 lg:px-8">
      <button aria-label="Open navigation" onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-50 lg:hidden">
        <Menu className="size-5" />
      </button>
      <div className="lg:hidden">
        <BrandMark />
      </div>
     
      <div className="relative ml-auto w-full max-w-[340px]">
        
      </div>
      <div className="relative" onClick={(event) => event.stopPropagation()}>
        <button
          aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-50"
        >
          <Bell className="size-[19px]" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-[#d94c42] px-1 text-[10px] font-bold leading-4 text-white ring-2 ring-[#fbfdf9]">
              {unread}
            </span>
          )}
        </button>
        {open && (
          <div role="dialog" aria-label="Notifications" className="absolute right-0 top-12 z-50 w-[min(390px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#d7e8dc] bg-white shadow-[0_18px_50px_rgba(18,61,45,0.18)]">
            <div className="flex items-center justify-between border-b border-[#edf3ee] px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Notifications</h2>
              <button onClick={() => Promise.all(notifications.filter((item) => !readIds.includes(item.id)).map((item) => markAsRead(item.id))).then(() => { setReadIds(notifications.map((item) => item.id)); setUnread(0) }).catch((error) => setNotificationError(error.message))} className="text-xs font-semibold text-[#1f7a52] hover:underline">
                Mark all as read
              </button>
            </div>
            {notificationError && <p role="alert" className="px-4 py-2 text-xs text-red-700">{notificationError}</p>}
            <div className="max-h-[390px] overflow-y-auto">
              {notifications.length === 0 && <p className="px-4 py-6 text-center text-xs text-slate-500">No notifications available.</p>}
              {notifications.map((notification) => {
                const isRead = readIds.includes(notification.id)
                return (
                  <button
                    key={notification.id}
                    onClick={() => {
                      markAsRead(notification.id).then(() => { setReadIds((current) => [...current, notification.id]); setUnread((count) => Math.max(0, count - 1)) }).catch((error) => setNotificationError(error.message))
                      setOpen(false)
                      router.push(notification.href)
                    }}
                    className={`block w-full text-left border-b border-[#edf3ee] px-4 py-3 transition hover:bg-[#f5faef] ${isRead ? 'bg-white' : 'bg-[#f4faef]'}`}
                  >
                    <div className="flex gap-3">
                      <span className={`mt-0.5 ${notification.tone}`}>
                        <AlertTriangle className="size-4" strokeWidth={2.4} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-xs ${isRead ? 'font-medium' : 'font-bold'} text-slate-900`}>{notification.title}</p>
                          <span className="shrink-0 text-[10px] text-slate-400">{notification.time}</span>
                        </div>
                        <p className="mt-1 text-[11px] font-medium text-[#587568]">{notification.meta}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{notification.description}</p>
                      </div>
                      {!isRead && <span className="mt-1 size-1.5 shrink-0 rounded-full bg-[#1f7a52]" />}
                    </div>
                  </button>
                )
              })}
            </div>
            <Link href="/alerts" onClick={() => setOpen(false)} className="block bg-[#fbfdf9] px-4 py-3 text-center text-xs font-bold text-[#1f7a52] hover:bg-[#f4faef]">
              View all notifications →
            </Link>
          </div>
        )}
      </div>
      <div className="hidden items-center gap-2 border-l border-slate-200 pl-3 sm:flex">
        <div className="flex size-9 items-center justify-center rounded-full bg-[#dbeee2] text-sm font-semibold text-[#256d4a]">{profile?.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() ?? 'U'}</div>
        <ChevronDown className="size-4 text-slate-400" />
      </div>
    </header>
  )
}
