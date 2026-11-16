export const adminItems = [
  { section: 'devices', label: 'All devices' },
  { section: 'users', label: 'Users' },
  { section: 'farms', label: 'All farms' },
  { section: 'readings', label: 'All readings' },
  { section: 'activity', label: 'Activity' },
] as const
export type AdminSection = typeof adminItems[number]['section']
export function isAdminSection(value: string): value is AdminSection { return adminItems.some((item) => item.section === value) }
export function canAccessAdmin(session: { status: string; isAdmin: boolean }): boolean { return session.status === 'ready' && session.isAdmin === true }
