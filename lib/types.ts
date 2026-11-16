export type Status = 'Online' | 'Warning' | 'Critical' | 'Offline' | 'Syncing' | 'Resolved'
export type FarmStatus = 'Online' | 'Warning' | 'Critical' | 'Offline'
export type DeviceStatus = 'Online' | 'Warning' | 'Offline' | 'Sensor fault'
export type AlertStatus = 'Open' | 'Acknowledged' | 'Resolved'
export type Severity = 'Critical' | 'Warning'
export type AlertType =
  | 'Low soil moisture'
  | 'High soil temperature'
  | 'pH outside range'
  | 'High EC'
  | 'Low battery'
  | 'Device offline'
  | 'Sensor fault'

export type Role = 'Administrator' | 'Farm Manager' | 'Agronomist' | 'Technician' | 'Viewer'
export type UserStatus = 'Active' | 'Pending' | 'Suspended'

export type PageKey = 'Overview' | 'Farms' | 'Devices' | 'Readings' | 'Alerts' | 'Users' | 'Settings'

export type Reading = {
  plot: string
  farm: string
  crop: string
  device: string
  status: Status
  moisture: number
  temperature: number
  ph: number
  ec: number
  updated: string
  battery: number
  signal: string
  timestamp?: string
  recorded?: string
}

export type Device = {
  id: string
  farm: string
  plot: string
  status: DeviceStatus
  battery: number
  signal: string
  firmware: string
  lastSeen: string
}

export type Farm = {
  id: string
  name: string
  location: string
  plots: number
  totalDevices: number
  onlineDevices: number
  offlineDevices: number
  openAlerts: number
  lastUpdate: string
  status: FarmStatus
}

export type Alert = {
  id: string
  severity: Severity
  type: AlertType
  farm: string
  plot: string
  device: string
  triggered: string
  updated: string
  status: AlertStatus
  current?: string
  threshold?: string
}

export type UserRecord = {
  id: string
  name: string
  email: string
  role: Role
  access: string
  status: UserStatus
  lastActive: string
  initials: string
}

export type NotificationItem = {
  id: string
  title: string
  meta: string
  description: string
  time: string
  tone: string
  href: string
}
